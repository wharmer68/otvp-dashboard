import type { AgentDefinition, AgentExecutor } from '../types/agent';

export interface AgentEntry {
  definition: AgentDefinition;
  executor: AgentExecutor;
}

export class AgentRegistry {
  private agents: Map<string, AgentEntry> = new Map();

  register(definition: AgentDefinition, executor: AgentExecutor): void {
    this.agents.set(definition.agent_id, { definition, executor });
  }

  get(agentId: string): AgentEntry | undefined {
    return this.agents.get(agentId);
  }

  getAll(): AgentEntry[] {
    return Array.from(this.agents.values());
  }

  getByDomain(domainPrefix: string): AgentEntry[] {
    return this.getAll().filter((entry) =>
      entry.definition.domain.startsWith(domainPrefix)
    );
  }
}
