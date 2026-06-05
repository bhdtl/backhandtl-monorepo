// src/types/tennis.ts

// --- 1. NEU: QUANTUM PREDICTIONS ---
// Das hat gefehlt! Ohne das crashen Importe in anderen Dateien.
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

// --- 2. PLAYER ---
export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  profile_image_url: string;
}

// --- 3. BET INFO ---
export interface ParsedBet {
  isBet: boolean;
  pickName: string;
  stake: number;
  edge: number;
  fairOdds: number;
  marketOdds: number;
  type: string; // <--- WICHTIG: Hat gefehlt (für Filter-Logik)
}

// --- 4. MATCH OBJECT (THE MOTHERSHIP) ---
export interface LiveValueMatch {
  id: string;
  playerA: Player;
  playerB: Player;
  
  marketOddsA: number;
  marketOddsB: number;
  
  // WICHTIG: Optional machen, damit OddsModal nicht crasht
  opening_odds1?: number; 
  opening_odds2?: number;

  betInfo: ParsedBet; // Source of Truth
  
  tournament: string;
  commencing: string;
  matchDate: string;
  actualWinnerName?: string | null;
  
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  
  neobet_spreads?: any[];
  neobet_over_unders?: any[];
  openOdds1?: number;
  openOdds2?: number;
  player1_name?: string;
  player2_name?: string;
  
  // WICHTIG: Die Verknüpfung zur Prediction
  games_prediction?: GamesPrediction; 
}