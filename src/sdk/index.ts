import { AgentRegistry } from './agent-registry';
import type { AgentDefinition, AgentExecutor, AgentContext } from '../types/agent';
import type { TrustEnvelope } from '../types/envelope';
import { AgentRunner } from './agent-runner';

const registry = new AgentRegistry();

export function registerAgent(def: AgentDefinition, executor: AgentExecutor): void {
  registry.register(def, executor);
}

export function getRegisteredAgents(): AgentDefinition[] {
  return registry.getAll().map(e => e.definition);
}

export function createRunner(): AgentRunner {
  return new AgentRunner(registry);
}

export { registry };
export type { AgentDefinition, AgentExecutor, AgentContext, TrustEnvelope };
