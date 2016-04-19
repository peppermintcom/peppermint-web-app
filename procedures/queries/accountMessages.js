import type {QueryResult} from '../../repository/types'

import messages from '../../repository/messages'

type Request = {
  email: string;
  start_time: number;
  end_time: number;
  order: 'chronological' | 'reverse';
  limit: number;
  role?: 'sender' | 'recipient';
  position?: string;
}

type Response = {
  received?: QueryResult,
  sent?: QueryResult,
}

export default function(req: Request): Promise<Response> {
  let params = {
    email: req.email,
    start_time: req.start_time,
    end_time: req.end_time,
    order: req.order,
  }
  let config = {
    limit: req.limit,
  }

  let queries = req.role ? [
    [Object.assign({role: req.role}, params), req.position ? Object.assign({position: req.position}, config) : config]
  ] : [
    [Object.assign({role: 'sender'}, params), config],
    [Object.assign({role: 'recipient'}, params), config],
  ];

  return Promise.all(queries.map((q) => messages.query(q[0], q.length === 2 ? q[1] : undefined)))
  .then(function(results) {
    let ret: Response = {};

    if (req.role) {
      ret[req.role] = results[0];
      return ret
    }
    ret.sender = results[0]
    ret.recipient = results[1]
    return ret
  })
}
