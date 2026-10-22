// These operator proofs depend on Linux ownership and root attestation, not
// merely on having a filesystem or a private Windows DACL.
export const linuxOperatorSupported = process.platform === 'linux';
export const linuxOperatorRequirement = 'Linux required: POSIX ownership, modes and root-attestation recovery proof; NOT VERIFIED on this platform';

export function assertLinuxOperator() {
  if (!linuxOperatorSupported) {
    throw Object.assign(new Error('LINUX_OPERATOR_REQUIRED'), {code:'LINUX_OPERATOR_REQUIRED'});
  }
}
