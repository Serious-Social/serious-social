import { formatBelief, formatUSDC } from './chain/abi';
import { type Bot } from './bots/bot';
import { type MarketTracker } from './markets/tracker';
import { SimLogger } from './logger';

export class Observer {
  private tickActions: number[] = [];

  constructor(private logger: SimLogger) {}

  recordTickActions(count: number): void {
    this.tickActions.push(count);
  }

  tickSummary(
    tick: number,
    actions: number,
    skips: number,
    tracker: MarketTracker,
  ): void {
    const markets = tracker.getActive();
    const totalStaked = markets.reduce(
      (sum, m) => sum + (m.state?.supportPrincipal ?? 0n) + (m.state?.opposePrincipal ?? 0n),
      0n,
    );

    this.logger.separator();
    this.logger.info(
      'observer',
      `Tick ${tick} complete: ${actions} actions, ${skips} skips | Active markets: ${markets.length} | Total staked: $${formatUSDC(totalStaked)}`,
    );

    // Show belief for each active market
    for (const m of markets) {
      if (m.state) {
        const belief = formatBelief(m.state.belief);
        const support = formatUSDC(m.state.supportPrincipal);
        const oppose = formatUSDC(m.state.opposePrincipal);
        this.logger.debug(
          'observer',
          `  "${m.title.slice(0, 45)}..." belief=${belief}% S=$${support} C=$${oppose} (${m.participantFids.size} participants)`,
        );
      }
    }
  }

  snapshot(tick: number, bots: Bot[], tracker: MarketTracker): void {
    this.logger.header(`=== SNAPSHOT (tick ${tick}) ===`);

    const markets = tracker.getActive();
    this.logger.info('observer', `Markets: ${markets.length}`);

    for (const m of markets) {
      if (m.state) {
        const belief = formatBelief(m.state.belief);
        const support = formatUSDC(m.state.supportPrincipal);
        const oppose = formatUSDC(m.state.opposePrincipal);
        const srp = formatUSDC(m.state.srpBalance);
        this.logger.info(
          'observer',
          `  "${m.title.slice(0, 50)}..."`,
          { belief: `${belief}%`, support: `$${support}`, challenge: `$${oppose}`, srp: `$${srp}`, participants: m.participantFids.size },
        );
      }
    }

    // Bot summary by personality
    const personalitySummary = new Map<string, { count: number; staked: bigint; positions: number }>();
    for (const bot of bots) {
      const p = bot.config.personality;
      const existing = personalitySummary.get(p) || { count: 0, staked: 0n, positions: 0 };
      existing.count++;
      existing.staked += bot.state.totalStaked;
      for (const positions of bot.state.positions.values()) {
        existing.positions += positions.length;
      }
      personalitySummary.set(p, existing);
    }

    this.logger.info('observer', 'Bot activity by personality:');
    for (const [personality, stats] of personalitySummary) {
      this.logger.info(
        'observer',
        `  ${personality}: ${stats.count} bots, ${stats.positions} positions, $${formatUSDC(stats.staked)} staked`,
      );
    }
  }

  finalReport(bots: Bot[], tracker: MarketTracker, totalTicks: number): void {
    this.logger.header('');
    this.logger.header('=== SIMULATION COMPLETE ===');
    this.logger.separator('=');

    const markets = tracker.getAll();
    const totalStaked = bots.reduce((sum, b) => sum + b.state.totalStaked, 0n);
    const totalPositions = bots.reduce((sum, b) => {
      let count = 0;
      for (const positions of b.state.positions.values()) count += positions.length;
      return sum + count;
    }, 0);

    this.logger.info('observer', `Duration: ${totalTicks} ticks`);
    this.logger.info('observer', `Markets created: ${markets.length}`);
    this.logger.info('observer', `Total positions: ${totalPositions}`);
    this.logger.info('observer', `Total USDC staked: $${formatUSDC(totalStaked)}`);
    this.logger.separator();

    // Market summary
    this.logger.header('Market Summary:');
    const sorted = [...markets].sort((a, b) => {
      const totalA = (a.state?.supportPrincipal ?? 0n) + (a.state?.opposePrincipal ?? 0n);
      const totalB = (b.state?.supportPrincipal ?? 0n) + (b.state?.opposePrincipal ?? 0n);
      return Number(totalB - totalA);
    });

    for (const m of sorted) {
      if (m.state) {
        const belief = formatBelief(m.state.belief);
        const support = formatUSDC(m.state.supportPrincipal);
        const oppose = formatUSDC(m.state.opposePrincipal);
        const srp = formatUSDC(m.state.srpBalance);
        console.log(
          `  "${m.title.slice(0, 55)}..."` +
          `\n    Belief: ${belief}% | Support: $${support} | Challenge: $${oppose} | SRP: $${srp} | Participants: ${m.participantFids.size}`,
        );
      }
    }

    this.logger.separator();

    // Bot performance by personality
    this.logger.header('Performance by Personality:');
    const personalityStats = new Map<string, {
      count: number;
      totalStaked: bigint;
      totalPositions: number;
      marketsCreated: number;
    }>();

    for (const bot of bots) {
      const p = bot.config.personality;
      const existing = personalityStats.get(p) || { count: 0, totalStaked: 0n, totalPositions: 0, marketsCreated: 0 };
      existing.count++;
      existing.totalStaked += bot.state.totalStaked;
      existing.marketsCreated += bot.state.marketsCreated;
      for (const positions of bot.state.positions.values()) {
        existing.totalPositions += positions.length;
      }
      personalityStats.set(p, existing);
    }

    for (const [personality, stats] of personalityStats) {
      const avgStake = stats.totalPositions > 0
        ? formatUSDC(stats.totalStaked / BigInt(Math.max(stats.totalPositions, 1)))
        : '0.00';
      console.log(
        `  ${personality.padEnd(15)} | ${stats.count} bots | ${stats.totalPositions} positions | $${formatUSDC(stats.totalStaked)} total | $${avgStake} avg/position | ${stats.marketsCreated} markets created`,
      );
    }

    // Top 10 most active bots
    this.logger.separator();
    this.logger.header('Top 10 Most Active Bots:');
    const botsByPositions = [...bots].sort((a, b) => {
      let countA = 0, countB = 0;
      for (const p of a.state.positions.values()) countA += p.length;
      for (const p of b.state.positions.values()) countB += p.length;
      return countB - countA;
    });

    for (const bot of botsByPositions.slice(0, 10)) {
      let posCount = 0;
      for (const p of bot.state.positions.values()) posCount += p.length;
      console.log(
        `  ${bot.config.name.padEnd(20)} (${bot.config.personality.padEnd(12)}) | ${posCount} positions | $${formatUSDC(bot.state.totalStaked)} staked`,
      );
    }

    this.logger.separator('=');
  }
}
