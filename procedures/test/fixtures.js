//@flow
import type {Recorder, Account, Message} from '../../repository/domain'

import fake from '../../repository/fake'
import fixtures from '../../repository/dynamo/test/fixtures'
import registerRecorder from '../commands/registerRecorder'
import registerAccount from '../commands/registerAccount'

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

function messages(options: Object): Promise<Message[]> {
  let count = Math.max(options.handled_count, options.read_count)
  let configs = []

  for (let i = 0; i < count; i++) {
    configs.push(fixtures.message({
      sender: options.sender,
      recipient: options.recipient,
      handled: i < options.handled_count,
      read: i < options.read_count,
    }))
  }

  return Promise.all(configs)
}

export default {
  recorder,
  account,
  messages,
}
