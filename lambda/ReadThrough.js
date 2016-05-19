//@flow

import spec from '../resources/reads/post/spec'
import readThrough from '../procedures/commands/readThrough'
import _ from './utils'

export default _.use([
  [{fn: _.validateContentType}, {fn: _.validateAPIKey}, {fn: _.authenticate, key: 'identity'}],
  [{fn: _.bodyValidator(spec)}],
  [{fn: allow}],
  [{fn: mark}],
], _.termLog)

function allow(state: Object): Promise<void> {
  if (!state.identity.account_id) {
    return Promise.reject(_.errAuth('Caller must be authenticated as message recipient'))
  }
  return Promise.resolve()
}

function mark(state: Object): Promise<void> {
  return readThrough({
    recipient_id: state.identity.account_id,
    message_id: state.body.data.id,
  })
}
