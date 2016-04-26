//@flow
import lodash from 'lodash'
import apps from '../utils/apps'
import jwt from '../utils/jwt'

//status 400
let ErrAPIKey = new Error('Invalid API Key')
//status 401
let ErrAuthorizationHeader = new Error('Authorization header should be formatted: Bearer <JWT>')

type handler = {
  fn: Function;
  //if key is defined, the result of fn will be added to the state object
  key?: string;
}
type action = handler[]

//Every action comprises one or more handlers that potentially mutate the state.
//All the handlers in a single action run concurrently on the same state. When
//all the handlers in a single action return, their result is applied to the
//state, then the next action is run. If a handler does not return a result it
//does not need to include a string key name where its result will be added to
//the state object. Mutations are limited to defined points between actions when
//no handlers are running. No handler should mutate the state object directly.
async function run(state: Object, actions: action[]): Promise<Object> {
  for (let i = 0; i < actions.length; i++) {
    let action: handler[] = actions[i]
    let results = await Promise.all(action.map((handler) => handler.fn(state)))

    for (let j = 0; j < results.length; j++) {
      if (action[j].key) {
        state[action[j].key] = results[j]
      }
    }
  }

  return state
}

//Adapt a batch of Promise routines to the format expected by new Lambda Node.js
//programming environment. One of the handlers must define a "response" property
//on the state, which will be returned to the caller.
function use(actions: action[]): Function {
  return function (req: Object, context: Object, cb: Function) {
    run(req, actions)
    .then(function(state) {
      //state === req because run mutates req
      cb(null, state.response);
    })
    .catch(function(err) {
      //TODO error processing
      cb(err);
      /*
      //known Peppermint errors
      if (err.status) {
        var e = new Error(err.status);

        e.name = JSON.stringify(_.pick(err, 'detail', 'title', 'code'));
        reply.fail(e);
        return;
      }
      //other errors can be passed on if they have a message property
      if (err.message) {

        //format name as jsonapi error if plain string
        try {
          JSON.parse(err.name);
        } catch(e) {
          //err.name is not already a JSON stringified error object with a
          //detail property so make it one
          err.name = JSON.stringify({detail: err.name});
        }

        reply.fail(err);
        return;
      }
      //errors without a message property will be mapped to the default
      //(OK) acction by Gateway, so add something that will be picked up
      //by an error integration in Lambda error regex.
      console.log('unknown error:');
      console.log(util.inspect(err, {depth: null}));
      reply.fail(new Error('Internal Server Error'));
      */
    });
  };
}


//Predicate whether provided key belongs to an app.
function isValidAPIKey(key: string): boolean {
  return !!apps[key];
};

//Throws an error if the state does not have a valid api_key. Returns null diff
//if the api_key is OK.
function validateAPIKey(state: Object): Promise<null> {
  return new Promise(function(resolve, reject) {
    if (!lodash.isString(state.api_key)) {
      reject(ErrAPIKey)
      return
    }
    if (!isValidAPIKey(state.api_key)) {
      reject(ErrAPIKey)
      return
    }
    resolve(null)
  })
}

/**
 * Checks and parses the JWT from an Authorization Bearer header.
 * Adds a "JWT" property to the request if authentication is ok.
 * @param {Authorization} string
 */
type identity = {
  account_id?: string;
  recorder_id?: string;
  email?: string;
}
function authenticate(state: Object): Promise<identity> {
  return new Promise(function(resolve, reject) {
    var parts = (state.Authorization || '').trim().split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      reject(ErrAuthorizationHeader);
      return;
    }

    let parsed = jwt.verify(parts[1]);

    if (parsed.err) {
      //status 401
      reject(new Error(parsed.err.toString()));
      return
    }

    resolve(parsed);
  });
};

export default {
  use,
  validateAPIKey,
  authenticate,
}
