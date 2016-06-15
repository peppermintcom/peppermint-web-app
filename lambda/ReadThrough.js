//@flow

import domain from '../domain'
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
  .catch(function(err) {
    var next: ?Object;

    switch (err.message) {
    case domain.ErrNoEntity:
      var e: Object = new Error('400')
      e.detail = 'Message not found'
      throw e
    case domain.ErrForbidden:
      var e: Object = new Error('403')
      e.detail = 'Forbidden'
      throw e
    }
    throw err
  })
}
