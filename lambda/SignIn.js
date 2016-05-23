//@flow
//Use the authenticate command to get the access token, account, and recorders.
//Then if the user requested related account.sent or account.received messages
//use the account messages query to look them up, then attach them.
import type {QueryResult} from '../repository/types'

import Authenticate from '../procedures/commands/authenticate'
import accounts from '../repository/accounts'
import _ from './utils'
import auth from '../utils/auth'

export default _.use([
  [{fn: _.validateAPIKey}, {fn: parseInclude, key: 'include'}],
  [{fn: decode, key: 'credentials'}],
  [{fn: authenticate, key: 'identity'}],
  [{fn: lookupIsReceiver, key: 'isReceiver'}],
  [{fn: response, key: 'response'}],
], _.termLog)

//account must be true if either sent or received is true because the JSON-API
//spec requires intermediate resources to be fully included in compound
//documents.
type inclusions = {
  recorder: boolean;
  account: boolean;
  sent: boolean;
  received: boolean;
}
function parseInclude(state: Object): inclusions {
  if (!state.include) {
    return {
      recorder: true,
      account: true,
      sent: false,
      received: false,
    }
  }
  let resources: Object = state.include.split(',').reduce((resources, resource) => {
    resources[resource] = true
    return resources
  }, {})

  let include: inclusions = {
    recorder: !!resources.recorder,
    account: !!resources.account,
    sent: !!resources['account.sent'],
    received: !!resources['account.received'],
  }

  if (include.sent || include.received) {
    include.account = true
  }

  return include
}

function decode(state: Object): Promise<Object> {
  return Promise.resolve(auth.decode(state.Authorization))
}

function authenticate(state: Object): Promise<Object> {
  return Authenticate(state.credentials)
}

//if state.include.sent attach an array of recent sent messages and next link
function lookupSent(state: Object): Promise<?QueryResult> {
  //queryAccountMessages();
  return Promise.resolve(null)
}

//if state.include.received attach an array of most recently received messages
//and a next page link
function lookupIsReceiver(state: Object): Promise<?QueryResult> {
  //queryAccountMessages();
  return Promise.resolve(null)
}

//returns true iff both an account and recorder are authenticated in the request
//and they are linked by the receiver relationship
//if both an account and recorder are authenticated by the request, check if
//they have a receiver relationship
function lookupReceiver(state: Object): Promise<boolean> {
  if (!state.identity.account || !state.identity.recorder) {
    return Promise.resolve(false)
  }
  return accounts.isReceiver(state.identity.account.account_id, state.identity.recorder.recorder_id)
}

//generate JSON-API representation of state
function response(state: Object): Promise<Object> {
  let accountResource = state.identity.account ? state.identity.account.resource() : null
  let recorderResource = state.identity.recorder ? state.identity.recorder.resource() : null
  let relationships: Object = {}
  let included = []

  if (accountResource) {
    if (state.isReceiver && recorderResource) {
      accountResource.relationships = {
        receivers: {
          data: [{type: 'recorders', id: recorderResource.id}],
        }
      }
    }
    relationships.account = {data: pickResourceID(accountResource)}
    included.push(accountResource)
  }

  if (recorderResource) {
    delete recorderResource.attributes.recorder_key;
    relationships.recorder = {data: pickResourceID(recorderResource)}
    included.push(recorderResource)
  }

  return Promise.resolve({
    data: {
      type: 'jwts',
      id: state.identity.token_id,
      attributes: {
        token: state.identity.access_token,
      },
      relationships: relationships,
    },
    included: included,
  })
}

let pickResourceID = ({id, type}) => ({id, type})
