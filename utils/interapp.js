//can't figure out flow error in default function so don't type check
import type {Recorder, Message} from '../domain'

import gcm from './gcm2'
import messages from './messages'
import timestamp from './timestamp'
import apps from './apps'

export default function(receivers: Recorder[], message: Message): Promise<Object> {
  return Promise.all([
    android(receivers, message),
    iOS(receivers, message),
  ])
  .then(function(results) {
    let androidSuccess = (results[0] && results[0].response.body.success) || 0
    let iOSSuccess = (results[1] && results[1].response.body.success) || 0

    return {
      success: androidSuccess + iOSSuccess,
      android: results[0],
      iOS: results[1],
    }
  })
}

//send the message to any android devices among the receivers
function android(receivers: Recorder[], message: Message): Promise<null|Object> {
  let androidReceivers = receivers.filter((r) => (apps.isAndroid(r.api_key)))

  if (!androidReceivers.length) {
    return Promise.resolve(null)
  }

  return formatAndroid(message)
    .then(function(message) {
      return gcm(androidReceivers, message)
        .then(function(response) {
          return {
            message: message,
            response: response,
          }
        })
    })
}

//send the message to any iOS devices among the receivers
function iOS(receivers: Recorder[], message: Message): Promise<?Object> {
  let iOSReceivers = receivers.filter((r) => (apps.isiOS(r.api_key)))
 
  if (!iOSReceivers.length) {
    return Promise.resolve(null)
  }

  return formatiOS(message)
    .then(function(message) {
      return gcm(iOSReceivers, message)
        .then(function(response) {
          return {
            message: message,
            response: response,
          }
        })
    })
}

//formats an interapp Message as a notification message for delivery to iOS
//apps.
function formatiOS(message: Message): Promise<Object> {
  return messages.recentUnreadCount(message.recipient.email, message.message_id)
  .then(function(count) {
    let who: string = message.sender.full_name || message.sender.email || 'someone'

    return {
      priority: 'high',
      notification: {
        badge : count.toString(),
        sound : 'notification.aiff',
        title: 'You have a new message',
        body: who + ' sent you a message',
        click_action : 'AudioMessage',
        sender_name: message.sender.full_name,
        sender_email: message.sender.email,
        created: timestamp(message.created),
      },
    };
  })
}

//formats an interapp Message as a data message for delivery to android apps.
function formatAndroid(message: Message): Promise<Object> {
  return Promise.resolve({
    priority: 'high',
    data: {
      audio_url: message.audioURL(),
      message_id: message.message_id,
      sender_name: message.sender.full_name,
      sender_email: message.sender.email,
      recipient_email: message.recipient.email,
      created: timestamp(message.created),
      transcription: message.upload.transcription && message.upload.transcription.text,
      duration: message.upload.duration,
    }
  })
}
