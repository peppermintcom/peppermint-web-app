//skip flow because it does not understand formatUpdate
import type {Upload, Account} from '../../domain'
import type {S, N, SS} from './types'

import url from 'url'
import dynamo from './client'
import domain from '../../domain'
import _ from '../utils'

type UploadItem = {
  pathname: S;
  created: N;
  sender_email?: S;
  sender_name?: S;
  postprocessed?: N;
  seconds?: N;
  uploaded?: N;
  pending_message_ids?: SS;
}
type UpdateAttrs = {
  messageID?: string;
  seconds?: number;
  uploaded?: number;
  postprocessed?: number;
}
type UploadConditions = {
  postprocessed?: null;
}

function read(pathname: string): Promise<Upload> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'uploads',
      Key: {
        pathname: {S: pathname},
      },
      ConsistentRead: true,
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (!data || !data.Item) {
        reject(domain.ErrNotFound);
        return;
      }
      resolve(parse(data.Item));
    });
  });
}

function save(u: Upload): Promise<Upload> {
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'uploads',
      Item: format(u),
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(u);
    });
  });
}

function update(pathname: string, attrs: UpdateAttrs, conditions: UploadConditions): Promise<Upload> {
  return new Promise(function(resolve, reject) {
    let updates = formatUpdate(attrs)
    let params: Object = {
      TableName: 'uploads',
      Key: {pathname: {S: pathname}},
      UpdateExpression: updates.expression,
      ExpressionAttributeValues: updates.values,
      ReturnValues: 'ALL_NEW',
    }

    if (conditions) {
      params.ConditionExpression = formatConditions(conditions)
    }

    dynamo.updateItem(params, function(err, data) {
      if (err) {
        reject(err)
        return
      }
      resolve(parse(data.Attributes))
    })
  })
}

function parse(item: UploadItem): Upload {
  var parts = _.decodePathname(item.pathname.S);

  var recorder = domain.makeRecorder({
    recorder_id: parts.recorder_id,
  });

  var creator: ?Account = null;
  if (item.sender_email) {
    var accountData: Object = {
      email: item.sender_email.S,
    }
    if (item.sender_name) {
      accountData.full_name = item.sender_name.S;
    }
    creator = domain.makeAccount(accountData);
  }

  return domain.makeUpload({
    upload_id: parts.id,
    content_type: parts.content_type,
    recorder: recorder,
    creator: creator,
    initialized: +item.created.N,
    uploaded: item.uploaded ? +item.uploaded.N : null,
    duration: item.seconds ? +item.seconds.N : null,
    postprocessed: item.postprocessed ? +item.postprocessed.N : null,
    pending_message_ids: item.pending_message_ids ? item.pending_message_ids.SS : [],
  });
}

function format(upload: Upload): UploadItem {
  var initialized = upload.initialized || 0;
  if (!initialized) {
    //just checking upload.initialized directly broke flow
    throw new Error('initialized timestamp is required when saving an upload');
  }
  var item: UploadItem =  {
    pathname: {S: upload.pathname()},
    created: {N: initialized.toString()},
  };

  if (upload.creator && upload.creator.email) {
    item.sender_email = {S: upload.creator.email};
    if (upload.creator.full_name) {
      item.sender_name = {S: upload.creator.full_name};
    }
  }
  if (upload.uploaded) {
    item.uploaded = {N: upload.uploaded.toString()};
  }
  if (upload.duration) {
    item.seconds = {N: upload.duration.toString()};
  }
  if (upload.postprocessed) {
    item.postprocessed = {N: upload.postprocessed.toString()};
  }

  return item;
}

function formatUpdate(attrs: UpdateAttrs): Object {
  let expressions: string[] = []
  let values: Object = {}
  let needsSet = false

  if (attrs.messageID) {
    expressions.push('ADD pending_message_ids :messageID')
    values[':messageID'] = {SS: [attrs.messageID]}
  }
  if (attrs.seconds) {
    expressions.push('seconds = :seconds')
    values[':seconds'] = {N: attrs.seconds.toString()}
    needsSet = true
  }
  if (attrs.uploaded) {
    expressions.push('uploaded = :uploaded')
    values[':uploaded'] = {N: attrs.uploaded.toString()}
    needsSet = true
  }
  if (attrs.postprocessed) {
    expressions.push('postprocessed = :postprocessed')
    values[':postprocessed'] = {N: attrs.postprocessed.toString()}
    needsSet = true
  }
 
  return {
    expression: (needsSet ? 'SET ' : '') + expressions.join(', '),
    values: values,
  };
}

function formatConditions(conditions: Object): string {
  let expressions = []

  if (conditions.postprocessed === null) {
    expressions.push('attribute_not_exists(postprocessed)')
  }

  return expressions.join(',')
}

module.exports = {read, save, update};
