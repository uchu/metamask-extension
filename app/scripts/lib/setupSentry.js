import * as Sentry from '@sentry/browser';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';

import { BuildType } from '../../../shared/constants/app';
import { FilterEvents } from './sentry-filter-events';
import extractEthjsErrorMessage from './extractEthjsErrorMessage';

/* eslint-disable prefer-destructuring */
// Destructuring breaks the inlining of the environment variables
const METAMASK_DEBUG = process.env.METAMASK_DEBUG;
const METAMASK_ENVIRONMENT = process.env.METAMASK_ENVIRONMENT;
const SENTRY_DSN_DEV = process.env.SENTRY_DSN_DEV;
const METAMASK_BUILD_TYPE = process.env.METAMASK_BUILD_TYPE;
const IN_TEST = process.env.IN_TEST;
/* eslint-enable prefer-destructuring */

// This describes the subset of Redux state attached to errors sent to Sentry
// These properties have some potential to be useful for debugging, and they do
// not contain any identifiable information.
export const SENTRY_STATE = {
  gas: true,
  history: true,
  metamask: {
    alertEnabledness: true,
    completedOnboarding: true,
    connectedStatusPopoverHasBeenShown: true,
    conversionDate: true,
    conversionRate: true,
    currentBlockGasLimit: true,
    currentCurrency: true,
    currentLocale: true,
    customNonceValue: true,
    defaultHomeActiveTabName: true,
    featureFlags: true,
    firstTimeFlowType: true,
    forgottenPassword: true,
    incomingTxLastFetchedBlockByChainId: true,
    ipfsGateway: true,
    isAccountMenuOpen: true,
    isInitialized: true,
    isUnlocked: true,
    metaMetricsId: true,
    nativeCurrency: true,
    network: true,
    nextNonce: true,
    participateInMetaMetrics: true,
    preferences: true,
    provider: {
      nickname: true,
      ticker: true,
      type: true,
    },
    seedPhraseBackedUp: true,
    showRestorePrompt: true,
    threeBoxDisabled: true,
    threeBoxLastUpdated: true,
    threeBoxSynced: true,
    threeBoxSyncingAllowed: true,
    unapprovedDecryptMsgCount: true,
    unapprovedEncryptionPublicKeyMsgCount: true,
    unapprovedMsgCount: true,
    unapprovedPersonalMsgCount: true,
    unapprovedTypedMessagesCount: true,
    useBlockie: true,
    useNonceField: true,
    usePhishDetect: true,
    welcomeScreenSeen: true,
  },
  unconnectedAccount: true,
};

export default function setupSentry() {
  return undefined;
}

function simplifyErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    // simplify ethjs error messages
    let simplifiedErrorMessage = extractEthjsErrorMessage(errorMessage);
    // simplify 'Transaction Failed: known transaction'
    if (
      simplifiedErrorMessage.indexOf(
        'Transaction Failed: known transaction',
      ) === 0
    ) {
      // cut the hash from the error message
      simplifiedErrorMessage = 'Transaction Failed: known transaction';
    }
    return simplifiedErrorMessage;
  });
}

function rewriteErrorMessages(report, rewriteFn) {
  // rewrite top level message
  if (typeof report.message === 'string') {
    report.message = rewriteFn(report.message);
  }
  // rewrite each exception message
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (typeof item.value === 'string') {
        item.value = rewriteFn(item.value);
      }
    });
  }
}

function rewriteReportUrls(report) {
  // update request url
  report.request.url = toMetamaskUrl(report.request.url);
  // update exception stack trace
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (item.stacktrace) {
        item.stacktrace.frames.forEach((frame) => {
          frame.filename = toMetamaskUrl(frame.filename);
        });
      }
    });
  }
}

function toMetamaskUrl(origUrl) {
  const filePath = origUrl.split(window.location.origin)[1];
  if (!filePath) {
    return origUrl;
  }
  const metamaskUrl = `metamask${filePath}`;
  return metamaskUrl;
}
