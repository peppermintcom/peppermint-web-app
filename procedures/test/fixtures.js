//@flow
import type {Recorder, Account, Message} from '../../repository/domain'

import fake from '../../repository/fake'
import fixtures from '../../repository/dynamo/test/fixtures'
import registerRecorder from '../commands/registerRecorder'
import registerAccount from '../commands/registerAccount'
import _jwt from '../../utils/jwt'

function recorder(): Promise<[Recorder, string]> {
  return registerRecorder({
    api_key: fake.API_KEY,
    client_id: null,
    recorder_key: null,
    description: null,
  })
  .then(function(res) {
    return [res.recorder, res.recorder_key || '']
  })
}

function account(): Promise<[Account, string]> {
  let password = fake.secret()

  return registerAccount({
    email: fake.email(),
    full_name: fake.name(),
    password: password,
  })
  .then(function(res) {
    return [res.account, password]
  })
}

//creates a given number of messages over the past month
function messages(options: Object): Promise<Message[]> {
  let count = Math.max(options.handled_count, options.read_count)
  let configs = []
  const MONTH = 1000 * 60 * 60 * 24 * 30
  let start = Date.now() - MONTH

  for (let i = 0; i < count; i++) {
    configs.push(fixtures.message({
      sender: options.sender,
      recipient: options.recipient,
      handled: i < options.handled_count,
      read: i < options.read_count,
      created: Date.now() - Math.round((Math.random() * MONTH)),
    }))
  }

  return Promise.all(configs)
}

//wrap jwt.creds to provide a single point of update for running tests in
//different environments
function jwt(accountID?: string, recorderID?: string): string {
  return _jwt.creds(accountID, recorderID)
}

export default {
  API_KEY: 'abc123',
  recorder,
  account,
  messages,
  jwt,
}
