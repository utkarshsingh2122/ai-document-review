import type { Contract, FindingsPayload } from './types';

export async function loadReviewData(): Promise<{ contract: Contract; findings: FindingsPayload }> {
  const [contractResponse, findingsResponse] = await Promise.all([
    fetch('/sample-contract.json'),
    fetch('/findings.json'),
  ]);

  if (!contractResponse.ok || !findingsResponse.ok) {
    throw new Error('Unable to load review data. Check the JSON files in public/.');
  }

  const [contract, findings] = await Promise.all([
    contractResponse.json() as Promise<Contract>,
    findingsResponse.json() as Promise<FindingsPayload>,
  ]);

  return { contract, findings };
}
