export function localizeBackendText(text: string | null | undefined, tFunc: (key: string, options?: any) => string): string {
    if (!text) return '';

    // Translate surface helper
    const getSurface = (surf: string) => {
        const s = surf.toLowerCase();
        if (s === 'clay') return tFunc('picks.clay', { defaultValue: 'Clay' });
        if (s === 'hard') return tFunc('picks.hard', { defaultValue: 'Hard' });
        if (s === 'grass') return tFunc('picks.grass', { defaultValue: 'Grass' });
        if (s === 'carpet') return tFunc('picks.carpet', { defaultValue: 'Carpet' });
        return surf;
    };

    // Pattern 1: Low Data Warning (sparse data)
    // ⚠️ Low Data Warning: {player_name} has sparse historical data on {surf} ({wins}W-{losses}L), scaling down stake by 30%.
    const pattern1 = /Low Data Warning:\s+(.*?)\s+has sparse historical data on\s+(\w+)\s+\((\d+)W-(\d+)L\), scaling down stake by 30%/i;
    const match1 = text.match(pattern1);
    if (match1) {
        return '⚠️ ' + tFunc('picks.patternLowDataSparse', {
            name: match1[1],
            surface: getSurface(match1[2]),
            wins: match1[3],
            losses: match1[4],
            defaultValue: `Low Data Warning: ${match1[1]} has sparse historical data on ${getSurface(match1[2])} (${match1[3]}W-${match1[4]}L), scaling down stake by 30%.`
        });
    }

    // Pattern 2: Low Data Warning (no profile)
    // ⚠️ Low Data Warning: {player_name} has no historical profile on {surf}, scaling down stake by 30%.
    const pattern2 = /Low Data Warning:\s+(.*?)\s+has no historical profile on\s+(\w+), scaling down stake by 30%/i;
    const match2 = text.match(pattern2);
    if (match2) {
        return '⚠️ ' + tFunc('picks.patternLowDataNoProfile', {
            name: match2[1],
            surface: getSurface(match2[2]),
            defaultValue: `Low Data Warning: ${match2[1]} has no historical profile on ${getSurface(match2[2])}, scaling down stake by 30%.`
        });
    }

    // Pattern 3: Caliber Matchup Warning
    // ⚠️ Caliber Matchup Warning: {player_name} struggles against similarly rated ELO opponents on {surf} with a {c_wr}% win rate ({wins}W-{losses}L) and margin of {c_margin} games.
    const pattern3 = /Caliber Matchup Warning:\s+(.*?)\s+struggles against similarly rated ELO opponents on\s+(\w+)\s+with a\s+(\d+)%\s+win rate\s+\((\d+)W-(\d+)L\)\s+and margin of\s+([+-]?\d+(?:\.\d+)?)\s+games/i;
    const match3 = text.match(pattern3);
    if (match3) {
        return '⚠️ ' + tFunc('picks.patternCaliberWarning', {
            name: match3[1],
            surface: getSurface(match3[2]),
            winRate: match3[3] + '%',
            wins: match3[4],
            losses: match3[5],
            margin: match3[6],
            defaultValue: `Caliber Matchup Warning: ${match3[1]} struggles against ELO-similar opponents on ${getSurface(match3[2])} (${match3[3]}% WR, ${match3[4]}W-${match3[5]}L, margin: ${match3[6]} games).`
        });
    }

    // Pattern 4: Player Surface Strength
    // 🚀 Player Surface Strength: {player_name} has a strong win rate of {win_rate}% ({wins}W-{losses}L) on {surf}.
    const pattern4 = /Player Surface Strength:\s+(.*?)\s+has a strong win rate of\s+(\d+(?:\.\d+)?)%\s+\((\d+)W-(\d+)L\)\s+on\s+(\w+)/i;
    const match4 = text.match(pattern4);
    if (match4) {
        return '🚀 ' + tFunc('picks.patternSurfaceStrength', {
            name: match4[1],
            winRate: match4[2] + '%',
            wins: match4[3],
            losses: match4[4],
            surface: getSurface(match4[5]),
            defaultValue: `Player Surface Strength: ${match4[1]} has a strong win rate of ${match4[2]}% (${match4[3]}W-${match4[4]}L) on ${getSurface(match4[5])}.`
        });
    }

    // Pattern 5: Player Surface Profile
    // 🎾 Player Surface Profile: {player_name} has a win rate of {win_rate}% ({wins}W-{losses}L) on {surf}.
    const pattern5 = /Player Surface Profile:\s+(.*?)\s+has a win rate of\s+(\d+(?:\.\d+)?)%\s+\((\d+)W-(\d+)L\)\s+on\s+(\w+)/i;
    const match5 = text.match(pattern5);
    if (match5) {
        return '🎾 ' + tFunc('picks.patternSurfaceProfile', {
            name: match5[1],
            winRate: match5[2] + '%',
            wins: match5[3],
            losses: match5[4],
            surface: getSurface(match5[5]),
            defaultValue: `Player Surface Profile: ${match5[1]} has a win rate of ${match5[2]}% (${match5[3]}W-${match5[4]}L) on ${getSurface(match5[5])}.`
        });
    }

    // Pattern 6: Caliber Matchup Strength
    // 🚀 Caliber Matchup Strength: {player_name} has won {c_wr}% ({wins}W-{losses}L) against similarly rated ELO opponents ({elo1}-{elo2}) on {surf}, covering by {c_margin} games.
    const pattern6 = /Caliber Matchup Strength:\s+(.*?)\s+has won\s+(\d+)%\s+\((\d+)W-(\d+)L\)\s+against similarly rated ELO opponents\s+\((\d+)-(\d+)\)\s+on\s+(\w+),\s+covering by\s+([+-]?\d+(?:\.\d+)?)\s+games/i;
    const match6 = text.match(pattern6);
    if (match6) {
        return '🚀 ' + tFunc('picks.patternCaliberStrength', {
            name: match6[1],
            winRate: match6[2] + '%',
            wins: match6[3],
            losses: match6[4],
            elo1: match6[5],
            elo2: match6[6],
            surface: getSurface(match6[7]),
            margin: match6[8],
            defaultValue: `Caliber Matchup Strength: ${match6[1]} won ${match6[2]}% (${match6[3]}W-${match6[4]}L) against ELO-similar (${match6[5]}-${match6[6]}) on ${getSurface(match6[7])}, covering by ${match6[8]} games.`
        });
    }

    // Pattern 7: Historical Cover Risk
    // ⚠️ Historical Cover Risk: {player_name} has covered the {spread} spread in only {wr}% of recent matches on {surf}.
    const pattern7 = /Historical Cover Risk:\s+(.*?)\s+has covered the\s+(\S+)\s+spread in only\s+(\d+(?:\.\d+)?)%\s+of recent matches on\s+(\w+)/i;
    const match7 = text.match(pattern7);
    if (match7) {
        return '⚠️ ' + tFunc('picks.patternCoverRisk', {
            name: match7[1],
            spread: match7[2],
            winRate: match7[3] + '%',
            surface: getSurface(match7[4]),
            defaultValue: `Historical Cover Risk: ${match7[1]} covered the ${match7[2]} spread in only ${match7[3]}% of matches on ${getSurface(match7[4])}.`
        });
    }

    // Pattern 8: Historical Cover Rate
    // 🚀 Historical Cover Rate: {player_name} has covered the {spread} spread in {wr}% of recent matches on {surf}.
    const pattern8 = /Historical Cover Rate:\s+(.*?)\s+has covered the\s+(\S+)\s+spread in\s+(\d+(?:\.\d+)?)%\s+of recent matches on\s+(\w+)/i;
    const match8 = text.match(pattern8);
    if (match8) {
        return '🚀 ' + tFunc('picks.patternCoverRate', {
            name: match8[1],
            spread: match8[2],
            winRate: match8[3] + '%',
            surface: getSurface(match8[4]),
            defaultValue: `Historical Cover Rate: ${match8[1]} covered the ${match8[2]} spread in ${match8[3]}% of matches on ${getSurface(match8[4])}.`
        });
    }

    // Pattern 9: Massive Over/Under Edge
    // 🔥 MASSIVE OVER EDGE: Model & History project {projected} games against bookmaker line {line}.
    // 🔥 MASSIVE UNDER EDGE: Model & History project {projected} games against bookmaker line {line}.
    const pattern9 = /MASSIVE\s+(OVER|UNDER)\s+EDGE:\s+Model\s+&\s+History project\s+(\d+(?:\.\d+)?)\s+games against bookmaker line\s+(\d+(?:\.\d+)?)/i;
    const match9 = text.match(pattern9);
    if (match9) {
        const typeRaw = match9[1].toUpperCase();
        const typeLocal = typeRaw === 'OVER' ? tFunc('picks.over', { defaultValue: 'OVER' }) : tFunc('picks.under', { defaultValue: 'UNDER' });
        return '🔥 ' + tFunc('picks.patternMassiveEdge', {
            type: typeLocal,
            projected: match9[2],
            line: match9[3],
            defaultValue: `MASSIVE ${typeLocal} EDGE: Model & History project ${match9[2]} games against bookmaker line ${match9[3]}.`
        });
    }

    return text;
}
