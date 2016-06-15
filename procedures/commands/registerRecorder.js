//@flow
import type {Recorder} from '../../domain'

import domain from '../../domain'
import token from '../../utils/randomtoken'
import recorders from '../../repository/recorders'
import _ from '../../utils'

export type Request = {
  api_key: string;
  client_id: ?string;
  recorder_key: ?string;
  description: ?string;
}

type Response = {
  access_token: string;
  recorder: Recorder;
  //if the recorder_key was undefined in the request the plaintext recorder_key
  //set by the command will be returned in the response
  recorder_key?: string;
}

export var Errors = {
  APIKey: domain.ErrAPIKey,
  Conflict: new Error(domain.ErrConflict),
}

export function validate(req: Request): ?Object {
  if (!_.apps[req.api_key]) {
    return Errors.APIKey;
  }
  return null;
}

export default function(req: Request): Promise<Response> {
  let err = validate(req)

  if (err) {
    return Promise.reject(err)
  }

  let clientID: string = req.client_id || token(22)
  let key: string = req.recorder_key || token(40)

  return _.bcryptHash(key)
    .then(function(recorder_key_hash) {
      return recorders.save(domain.newRecorder({
        api_key: req.api_key,
        client_id: clientID,
        recorder_key_hash: recorder_key_hash,
        description: req.description,
      }), {checkConflict: true})
      .then(function(recorder) {
        delete recorder.recorder_key_hash;

        let res: Response = {
          access_token: _.jwt.creds(null, recorder.recorder_id),
          recorder: recorder,
        }
        //see note in Respone type
        if (!req.recorder_key) {
          res.recorder_key = key
        }

        return res;
      });
    });
}
