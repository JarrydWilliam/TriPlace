export interface SystemIssue {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  details?: any;
  createdAt: string;
}

export class IssueTracker {
  private issues: Map<string, SystemIssue> = new Map();
  private fixes: any[] = [];

  public async record(data: any, details?: any): Promise<SystemIssue> {
    const id = `issue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const issueData = typeof data === "string" ? { name: data, path: details?.path || "/", severity: "medium" } : data;
    const issue: SystemIssue = {
      id,
      title: `[${(issueData.severity || "medium").toUpperCase()}] ${issueData.name || "Issue"}`,
      severity: issueData.severity || "medium",
      status: "open",
      details: data,
      createdAt: new Date().toISOString(),
    };
    this.issues.set(id, issue);
    console.log(`[IssueTracker] Recorded issue: ${issue.title}`);
    return issue;
  }

  public async recordFix(fixData: any, result?: string): Promise<void> {
    this.fixes.push({
      details: fixData,
      result,
      timestamp: new Date().toISOString(),
    });
    console.log(`[IssueTracker] Recorded fix:`, fixData);
  }

  public getIssues(): SystemIssue[] {
    return Array.from(this.issues.values());
  }

  public getFixes(): any[] {
    return this.fixes;
  }
}

export const issueTracker = new IssueTracker();
