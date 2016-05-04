//@flow
import type {Account, Recorder} from '../domain'

import domain from '../domain'
import dynamo from './dynamo/accounts'
import receivers from './dynamo/receivers'
import recorders from './dynamo/recorders'

//upsert inserts the account if it does not exist. If the account does exist but
//is unverified and the argument account is verified, save the verification data
//back to the existing account record. It does not overwrite existing
//attributes.
function upsert (a: Account): Promise<Account> {
  if (!a.email) {
    throw new Error('Email is required');
  }

  return dynamo.read(a.email)
    .then(function(account) {
      //the possible update if the account does exist
      if (a.verified && !account.verified) {
        account.verified = a.verified;
        account.verification_source = a.verification_source;
        return dynamo.save(account);
      }

      //no update or insert
      return account;
    })
    .catch(function(err) {
      if (err == domain.ErrNotFound) {
        //the insert if the account does not exist
        return dynamo.save(a);
      }
      else throw err;
    });
}

//Fetch the recorders related to an account by the receiver relationship.
function getRecorders(accountID: string): Promise<Recorder[]> {
  return receivers.recorder_ids(accountID)
    .then(function(recorderIDs) {
      return Promise.all(recorderIDs.map((recorderID) => (
        recorders.readByID(recorderID)
      )))
    })
    .then(function(recorders) {
      return recorders.filter(function(recorder) {
        return !!recorder
      })
    })
}

//Filter the account recorders by those with gcm_registration_token - capable of
//receiving push notifications.
function getReceivers(accountID: string): Promise<Recorder[]> {
  return getRecorders(accountID)
    .then(function(recorders) {
      return recorders.filter(function(recorder) {
        return !!recorder.gcm_registration_token
      })
    })
}

export default {
  upsert,
  read: dynamo.read,
  readByID: dynamo.readByID,
  save: dynamo.save,
  recorders: getRecorders,
  receivers: getReceivers,
  link: receivers.save,
}
