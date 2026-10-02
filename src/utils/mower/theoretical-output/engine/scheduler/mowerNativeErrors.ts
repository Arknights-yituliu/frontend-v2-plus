/** Native Python exception categories used by the pinned infra_main/BaseSolver.run boundaries. */
export class MowerExitError extends Error {}
export class MowerRecognizeError extends Error {override name='RecognizeError'}
export class MowerConnectionError extends Error {}
export class MowerConnectionAbortedError extends Error {}
export class MowerAttributeError extends Error {}
export function rethrowMowerInfraFatal(error:unknown):void {
 if(error instanceof MowerExitError||
  error instanceof Error&&[MowerConnectionError,MowerConnectionAbortedError,MowerAttributeError].some(type=>error.constructor===type))throw error
}
