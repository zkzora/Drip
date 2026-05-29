import type { DripAccessResult, CheckDripAccessParams } from "../chain";

export interface DripChainAdapter {
  checkDripAccess(params: CheckDripAccessParams): Promise<DripAccessResult>;
}
