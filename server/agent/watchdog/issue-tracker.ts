export interface IssueLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  resolved: boolean;
}

export class IssueTracker {
  private issues: IssueLog[] = [];

  log(type: string, message: string): void {
    const issue: IssueLog = {
      id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      resolved: false,
    };
    this.issues.push(issue);
    console.log(`[IssueTracker] [${type}] ${message}`);
  }

  record(typeOrItem: any, details?: any): void {
    const message = typeof typeOrItem === "string" ? `${typeOrItem}: ${JSON.stringify(details || {})}` : JSON.stringify(typeOrItem);
    this.log("REGRESSION", message);
  }

  recordFix(fixNameOrObj: any, result?: string): void {
    const message = typeof fixNameOrObj === "string" ? `Applied fix '${fixNameOrObj}': ${result || ''}` : JSON.stringify(fixNameOrObj);
    this.log("AUTO_HEAL", message);
  }

  getIssues(): IssueLog[] {
    return this.issues;
  }
}

export const issueTracker = new IssueTracker();
