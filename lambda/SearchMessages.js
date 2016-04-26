//@flow
import type {QueryResult} from '../repository/types'
import type {Account} from '../repository/domain'

import url from 'url'
import accountMessages from '../procedures/queries/accountMessages'
import accounts from '../repository/accounts'
import timestamp from '../utils/timestamp'
import parseTime from '../utils/parseTime'
import _ from './utils'

const RECIPIENT = 'recipient'
const SENDER = 'sender'

let ErrForbidden = new Error('Forbidden')
let ErrInvalid = new Error('Bad Request')

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
])

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
  let since: number = state.since ? parseTime(state.since).valueOf() : 0;
  let until: number = state.until ? parseTime(state.until).valueOf() : Date.now() + 60000;
  let limit = state.limit ? Math.min(state.limit, 200) : 200;
  let position = state.position;

  return accountMessages({
    email: state.caller.email,
    role: state.role,
    position: position,
    order: state.reverse ? 'reverse' : 'chronological',
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
  return url.format({
    protocol: 'https',
    host: 'qdkkavugcd.execute-api.us-west-2.amazonaws.com',
    pathname: '/prod/v1/messages',
    query: {
      position: position(state),
      since: state.since,
      until: state.until,
      recipient: state.recipient_id && state.messages.recipient.position,
      sender: state.sender_id && state.messages.sender.position,
    },
  });
}

//compute the query position parameter from messages query results
function position(state) {
  if (state.role === RECIPIENT) {
    return state.messages.recipient.position
  }
  return state.messages.sender.position
}
