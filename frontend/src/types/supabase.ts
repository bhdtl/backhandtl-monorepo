export interface GamesPrediction {
  predicted_line: number;
  median_games: number;
  probabilities: {
    over_20_5: number;
    over_21_5: number;
    over_22_5: number;
    over_23_5: number;
  };
  sim_details: {
    p1_est_hold_pct: number;
    p2_est_hold_pct: number;
  };
}

// In deinem Match Interface:
export interface MarketMatch {
  // ... existierende Felder ...
  games_prediction?: GamesPrediction; // Das neue JSON Feld
}