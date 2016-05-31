//@flow
//This routine always saves a new message to the messages table and may also
//pass the message to GCM for delivery if it is ready. It is ready when the
//upload has completed and the postprocessing function has added a duration to
//the upload object. This routine and the postprocessing routine run around the
//same time so we must use strong consistency to check whether the
//postprocessing is complete, indicated by the postprocessed timestamp on the
//upload item. If incomplete, set the pending_message_ids on the upload to
//signal the postprocessing routine to deliver the message.
import type {Recorder, Upload, Account, Message} from '../domain'

import url from 'url'
import push from '../utils/interapp'
import accounts from '../repository/accounts'
import domain from '../domain'
import uploads from '../repository/uploads'
import messages from '../repository/messages'
import domainUtils from '../domain/utils'
import spec from '../resources/messages/post/spec'
import _ from './utils'

export default _.use([
  [{fn: _.validateContentType}, {fn: _.validateAPIKey}, {fn: _.authenticate, key: 'identity'}],
  [{fn: _.bodyValidator(spec)}, {fn: validateAccountAuth}],
  [{fn: lookupAccounts, key: 'accounts'}],
  [{fn: allow}],
  [{fn: lookupRecipientReceivers, key: 'receivers'}, {fn: lookupUpload, key: 'upload'}],
  [{fn: newMessage, key: 'message'}],
  [{fn: saveMessage}],
  //saveMessage must complete before savePendingMessageID so that whenever
  //postprocessing reads pending_message_ids on the upload it is guaranteed to
  //be able to read the message
  [{fn: savePendingMessageID, key: 'isUploadReady'}],
  [{fn: maybeDeliver, key: 'delivery'}],
  [{fn: saveDeliveryResults, key: 'message'}],
  [{fn: format, key: 'response'}],
], _.termLog)

//ensure the auth token authenticates an account, not just a recorder
function validateAccountAuth(state: Object): Promise<null> {
  return new Promise(function(resolve, reject) {
    //identity property added to state in the first batch of runners
    if (!state.identity.account_id) {
      reject(_.errAuth('Auth token does not authenticate an account'))
      return
    }
    resolve(null)
  })
}

//Returns an object with sender and recipient account entities.
//It is a 400 error if either does not exist.
function lookupAccounts(state: Object): Promise<{sender: Account, recipient: Account}> {
  return Promise.all([
    accounts.read(state.body.data.attributes.sender_email),
    accounts.read(state.body.data.attributes.recipient_email),
  ])
  .then(function(results) {
    let accounts = {
      sender: results[0],
      recipient: results[1],
    }

    if (!accounts.sender) {
      throw _.errInvalid('No account exists with sender_email')
    }
    if (!accounts.recipient) {
      throw _.errNotFound('Recipient cannot receive messages via Peppermint')
    }
    
    return accounts
  })
  .catch(function(err) {
    throw _.errNotFound('Recipient cannot receive messages via Peppermint')
  })
}

//Check that the authenticated user account_id is the sender. Uses "identity"
//and "accounts" properties added to state in previous tasks.
function allow(state: Object): Promise<null> {
  return new Promise(function(resolve, reject) {
    if (state.accounts.sender.account_id !== state.identity.account_id) {
      reject(_.errForbidden('Auth token is not valid for sender'))
      return
    }
    resolve(null)
  })
}

//Fetch the recipients recorders set up to receive push notifications. Throw an
//error if the recipient does not have at least one such recorder.
function lookupRecipientReceivers(state: Object): Promise<Recorder[]> {
  return accounts.receivers(state.accounts.recipient.account_id)
    .then(function(receivers) {
      if (!receivers.length) {
        throw _.errNotFound('Recipient cannot receive messages via Peppermint')
      }
      return receivers
    })
}

//Fetch the upload for the duration, postprocessed timestamp, and transcription.
function lookupUpload(state: Object): Promise<Upload> {
  try {
    let parts = domainUtils.decodePathname(state.body.data.attributes.audio_url)

    return uploads.read(domainUtils.encodePathname(parts))
      .catch(function(err) {
        throw _.errInvalid('No upload found at audio_url')
      })
  } catch(e) {
    throw _.errInvalid('No upload found at audio_url')
  }
}

//Call the message factory.
function newMessage(state: Object): Promise<Message> {
  return new Promise(function(resolve, reject) {
    resolve(domain.newMessage({
      upload: state.upload,
      sender: state.accounts.sender,
      recipient: state.accounts.recipient,
    }))
  })
}

//Save the undelivered message.
function saveMessage(state: Object): Promise<Message> {
  return messages.save(state.message)
}

//Attempts to save the message_id to the upload as pending. This will fail if
//the upload is already postprocessed and this routine is responsible for
//delivery. Return true iff this routine is responsible for delivery.
function savePendingMessageID(state: Object): Promise<boolean> {
  return uploads.addPendingMessageID(state.upload.pathname(), state.message.message_id)
    .then(function(upload) {
      //null means the pending message id was not added to the upload because it
      //is already postprocessed so return true to indicate upload is ready for
      //delivery.
      return !upload
    })
}

//Pass the message to GCM if ready for delivery. The savePendingMessageID task
//will have set isUploadReady to true if this routine is responsible for
//delivery.
function maybeDeliver(state: Object): Promise<?Object> {
  if (!state.isUploadReady) {
    return Promise.resolve(null)
  }

  return push(state.receivers, state.message)
    .then(function(result) {
      if (!result.success) {
        //log is for production
        _.log(result)
        throw _.errNotFound('recipient cannot receive Peppermint messages')
      }
      return result
    })
}

//update the message entity if it was delivered. The maybeDeliver task sets a
//delivery field on the state if it delivered the message.
function saveDeliveryResults(state: Object): Promise<Message> {
  if (!state.delivery) {
    return Promise.resolve(state.message)
  }

  let handling: Object = {}
  handling.handled = Date.now()
  handling.handled_by = 'lambda.NewMessage'
  handling.outcome = 'GCM success count: ' + state.delivery.success

  return messages.save(Object.assign(state.message, handling))
}

//json-api response
function format(state: Object): Promise<Object> {
  return Promise.resolve({
    data: state.message.resource(),
  })
}
