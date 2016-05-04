//@flow
import type {Account} from '../domain'
import type {QueryResult} from '../repository/types'

import url from 'url'
import accountMessages from '../procedures/queries/accountMessages'
import accounts from '../repository/accounts'
import timestamp from '../utils/timestamp'
import parseTime from '../utils/parseTime'
import _ from './utils'

const RECIPIENT = 'recipient'
const SENDER = 'sender'

let ErrForbidden: Object = new Error('403')
ErrForbidden.detail = 'Forbidden'
let ErrInvalid: Object = new Error('400')
ErrInvalid.detail = 'Bad Request'

export default _.use([
  [
    {fn: _.validateAPIKey},
    {key: 'identity', fn: _.authenticate},
  ],
  [
    {key: 'role', fn: role},
  ],
  [
    {fn: allow},
  ],
  [
    {key: 'caller', fn: lookupAccount},
  ],
  [
    {key: 'messages', fn: query},
  ],
  [
    {key: 'response', fn: respond},
  ],
], function(err, req, state) {
  if (err) {
    _.log(err)
  }
  _.log(state)
  return Promise.resolve()
})

function role(state: Object): Promise<'recipient' | 'sender'> {
  return new Promise(function(resolve, reject) {
    if (state.recipient_id && state.sender_id) {
      reject(ErrInvalid)
      return
    }
    if (state.recipient_id) {
      resolve(RECIPIENT)
      return
    }
    if (state.sender_id) {
      resolve(SENDER)
      return
    }
    reject(ErrInvalid)
  })
}

function allow(state: Object): Promise<null> {
  return new Promise(function(resolve, reject) {
    if (state.role === SENDER && state.identity.account_id !== state.sender_id) {
      reject(ErrForbidden)
      return
    }
    if (state.role === RECIPIENT && state.identity.account_id !== state.recipient_id) {
      reject(ErrForbidden)
      return
    }
    resolve(null)
  })
}

function lookupAccount(state: Object): Promise<Account> {
  return accounts.readByID(state.identity.account_id)
}

function query(state: Object): Promise<QueryResult> {
  let since: number = state.since && parseTime(state.since)
  let until: number = state.until && parseTime(state.until)
  let limit: number = state.limit && +state.limit
  let position = state.position;

  since = (since && since.valueOf()) || 0
  until = (until && until.valueOf()) || Date.now() + 60000
  limit = (limit && Math.min(limit, 200)) || 200

  //dynamo query does not allow since to be greater than until
  if (since > until) {
    until = since
  }

  return accountMessages({
    email: state.caller.email,
    role: state.role,
    position: position,
    order: state.order === 'reverse' ? 'reverse' :  'chronological',
    start_time: since,
    end_time: until,
    limit: limit,
  })
}

//generates JSON-API body
function respond(state): Promise<Object> {
  let resource = (x) => (x.resource())
  let body: Object = {}

  if (state.role === RECIPIENT) {
    body.data = state.messages.recipient.entities.map(resource)
    if (state.messages.recipient.position) {
      body.links = {
        next: next(state),
      }
    }
  }

  if (state.role === SENDER) {
    body.data = state.messages.sender.entities.map(resource)
    if (state.messages.sender.position) {
      body.links = {
        next: next(state),
      }
    }
  }

  return Promise.resolve(body)
}

//returns a link to the next page of results in this query
function next(state: Object): string {
  let q: Object = {
    position: position(state),
  }

  if (state.since) {
    q.since = state.since
  }
  if (state.until) {
    q.until = state.until
  }
  if (state.limit) {
    q.limit = state.limit
  }
  if (state.order) {
    q.order = state.order
  }
  if (state.sender_id) {
    q.sender = state.sender_id
  }
  if (state.recipient_id) {
    q.recipient = state.recipient_id
  }

  return url.format({
    protocol: 'https',
    host: 'qdkkavugcd.execute-api.us-west-2.amazonaws.com',
    pathname: '/prod/v1/messages',
    query: q,
  })
}

//compute the query position parameter from messages query results
function position(state) {
  if (state.role === RECIPIENT) {
    return state.messages.recipient.position
  }
  return state.messages.sender.position
}
