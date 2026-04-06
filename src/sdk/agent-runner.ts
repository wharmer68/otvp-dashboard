import type { AgentContext } from '../types/agent';
import type { TrustEnvelope } from '../types/envelope';
import { AgentRegistry } from './agent-registry';
import { EnvelopeBuilder } from './envelope-builder';

export interface RunResult {
  envelopes: TrustEnvelope[];
  errors: { agent_id: string; error: Error }[];
}

export class AgentRunner extends EventTarget {
  private registry: AgentRegistry;
  private builder: EnvelopeBuilder;

  constructor(registry: AgentRegistry) {
    super();
    this.registry = registry;
    this.builder = new EnvelopeBuilder();
  }

  async run(
    context: AgentContext,
    agentIds?: string[]
  ): Promise<RunResult> {
    const entries = agentIds
      ? agentIds
          .map((id) => this.registry.get(id))
          .filter(
            (e): e is NonNullable<typeof e> => e !== undefined
          )
      : this.registry.getAll();

    const promises = entries.map(async (entry) => {
      const { definition, executor } = entry;
      this.dispatchEvent(
        new CustomEvent('agent:start', {
          detail: { agent_id: definition.agent_id },
        })
      );

      const result = await executor(context);

      const envelope = this.builder.build(
        result,
        context.organization,
        context.otvp_id,
        context.environment
      );

      this.dispatchEvent(
        new CustomEvent('agent:complete', {
          detail: {
            agent_id: definition.agent_id,
            envelope,
          },
        })
      );

      return { agent_id: definition.agent_id, envelope };
    });

    const settled = await Promise.allSettled(promises);

    const envelopes: TrustEnvelope[] = [];
    const errors: { agent_id: string; error: Error }[] = [];

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      if (outcome.status === 'fulfilled') {
        envelopes.push(outcome.value.envelope);
      } else {
        const agentId = entries[i].definition.agent_id;
        const error =
          outcome.reason instanceof Error
            ? outcome.reason
            : new Error(String(outcome.reason));
        errors.push({ agent_id: agentId, error });
        this.dispatchEvent(
          new CustomEvent('agent:error', {
            detail: { agent_id: agentId, error },
          })
        );
      }
    }

    this.dispatchEvent(
      new CustomEvent('run:complete', {
        detail: { envelopes, errors },
      })
    );

    return { envelopes, errors };
  }
}
