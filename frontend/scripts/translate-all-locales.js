import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/locales');

const translations = {
  "de": {
    "courts": {
      "alerts": {
        "invalidBsi": "Ungültiges BSI-Rating. Muss zwischen 1 und 100 liegen.",
        "saveError": "Fehler beim Speichern der Court-Details.",
        "deleteConfirm": "Bist du sicher, dass du diesen Court löschen möchtest?",
        "deleteError": "Fehler beim Löschen des Courts."
      },
      "loading": "Lade Platzdaten..."
    },
    "loadManagement": {
      "statusText": {
        "fresh": "FRISCH",
        "critical": "KRITISCHE BELASTUNG",
        "heavy": "SCHWERE BEINE",
        "rhythm": "SPIELRHYTHMUS"
      },
      "descriptions": {
        "fresh": "Optimaler körperlicher Zustand. Keine Anzeichen von Müdigkeit erwartet.",
        "critical": "Extreme Müdigkeit. Massives Risiko von Leistungseinbrüchen in späten Sätzen.",
        "heavy": "Erhöhte Belastung in den letzten 2 Wochen. Erholungsdefizit wahrscheinlich.",
        "rhythm": "Perfekter Spielrhythmus. Spieler ist eingespielt, ohne überarbeitet zu sein."
      },
      "title": "Physiologischer Belastungsstatus",
      "timeOnCourt": "Zeit auf dem Platz (Letzte 14 Tage)",
      "min": "Min",
      "assessment": "Belastungsanalyse",
      "comebackRating": "Comeback Rating",
      "post1stSetLoss": "Nach Satzverlust (1. Satz)",
      "statsSummary": "{{wins}}S – {{losses}}N ({{rate}}%)",
      "comebackDesc": "Misst die Fähigkeit des Spielers, nach dem Verlust des ersten Satzes das Match noch zu drehen, basierend auf den jüngsten Spielergebnissen."
    },
    "intelligence": {
      "briefings": "KI-Analysen & Berichte",
      "viewHub": "Hub ansehen",
      "noAlerts": "Keine aktuellen Warnungen gefunden. Der Spieler scheint physisch und mental stabil zu sein.",
      "keyTakeaways": "Wichtigste Erkenntnisse:",
      "readOriginal": "Originalquelle lesen",
      "scoutingDossier": "Scouting & Composure Dossier",
      "updated": "Aktualisiert",
      "coreStrengths": "Kernstärken",
      "noStrengths": "Keine Details zu Stärken aufgezeichnet.",
      "developmentAreas": "Schwachstellen & Entwicklung",
      "noWeaknesses": "Keine Details zu Schwachstellen aufgezeichnet.",
      "psychologicalProfile": "Psychologisches Profil",
      "defaultMental": "Mentale Resilienz-Indikatoren sind im Standardbereich. Keine spezifischen composure Warnungen vorliegend."
    },
    "scouting": {
      "defaultStrengths": "Elitäres Grundlinienspiel, kraftvoller erster Aufschlag und schnelle laterale Platzabdeckung.",
      "defaultWeaknesses": "Anfällig unter Druck beim Return des zweiten Aufschlags; gelegentliche unerzwungene Fehler bei hohen Vorhandbällen.",
      "defaultMental": "Behält eine hohe Konzentration bei. Zeigt solide Resilienz im Tiebreak, lässt aber gelegentlich die Fassung vermissen bei frühen Breaks."
    },
    "playerDropdown": {
      "unknownPlayer": "Unbekannter Spieler",
      "searchPlaceholder": "Spieler nach Name suchen...",
      "noResultsSearch": "Keine Spieler gefunden, die deiner Suche entsprechen.",
      "noPlayers": "Keine Spieler verfügbar."
    },
    "skillBar": {
      "ariaLabel": "Fähigkeits-Bewertung"
    },
    "surfaceMastery": {
      "preferredSurface": "Bevorzugter Belag",
      "specialist": "{{surface}}-Spezialist",
      "rating": {
        "average": "Durchschnittlich",
        "elite": "ELITE",
        "strong": "STARK",
        "solid": "SOLIDE",
        "vulnerable": "ANFÄLLIG",
        "weakness": "SCHWÄCHE"
      },
      "matches": "{{count}} SPIELE",
      "best": "BESTER"
    },
    "vegasForm": {
      "quantumEngine": "Quantum Form Engine",
      "form": "FORM",
      "recentForm": "Aktuelle Form (Letzte 5)",
      "noMatchRecords": "Keine Spielergebnisse gefunden.",
      "overallWinLoss": "Gesamt-Siegquote",
      "filterSortMatches": "Spiele filtern & sortieren",
      "sort": "Sortierung",
      "newest": "Neueste zuerst",
      "oldest": "Älteste zuerst",
      "matchLog": "Spielprotokoll & Wettquoten",
      "showingMatches": "Zeige {{count}} Spiele",
      "noMatchesFound": "Keine Spiele gefunden, die den ausgewählten Filtern entsprechen.",
      "quote": "Quote",
      "won": "Gewonnen",
      "lost": "Verloren",
      "partnerOffer": "Exklusives Partnerangebot",
      "liveAction": "NEO.bet Live-Wetten",
      "partnership": "Partnerschaft",
      "partnerDesc": "Platziere eine Wette direkt bei NEO.bet für das nächste Spiel dieses Spielers. Sichere dir erstklassige ATP/WTA-Quoten und nutze die täglichen KI-Erkenntnisse von Backhand Tennis Line, um deinen Vorteil zu maximieren.",
      "betLive": "Live wetten bei NEO.bet"
    },
    "mobileMenu": {
      "nav": {
        "tournamentOracle": "Turnier-Orakel"
      }
    }
  },
  "es": {
    "courts": {
      "alerts": {
        "invalidBsi": "Calificación BSI inválida. Debe estar entre 1 y 100.",
        "saveError": "Error al guardar los detalles de la pista.",
        "deleteConfirm": "¿Estás seguro de que quieres eliminar esta pista?",
        "deleteError": "Error al eliminar la pista."
      },
      "loading": "Cargando datos de las pistas..."
    },
    "loadManagement": {
      "statusText": {
        "fresh": "FRESCO",
        "critical": "CARGA CRÍTICA",
        "heavy": "PIERNAS PESADAS",
        "rhythm": "RITMO DE PARTIDO"
      },
      "descriptions": {
        "fresh": "Condición física óptima. No se esperan signos de fatiga.",
        "critical": "Fatiga extrema. Riesgo masivo de caída de rendimiento en sets finales.",
        "heavy": "Mayor carga en las últimas 2 semanas. Probable déficit de recuperación.",
        "rhythm": "Ritmo de partido perfecto. El jugador está concentrado sin estar sobrecargado."
      },
      "title": "Estado de Carga Fisiológica",
      "timeOnCourt": "Tiempo en Pista (Últimos 14 Días)",
      "min": "Min",
      "assessment": "Evaluación de Carga",
      "comebackRating": "Calificación de Remontada",
      "post1stSetLoss": "Tras perder el 1er set",
      "statsSummary": "{{wins}}V – {{losses}}D ({{rate}}%)",
      "comebackDesc": "Mide la capacidad del jugador para salvar una victoria después de perder el primer set, calculado a partir de su historial de partidos recientes."
    },
    "intelligence": {
      "briefings": "Informes de Inteligencia IA",
      "viewHub": "Ver Centro",
      "noAlerts": "No se encontraron alertas de inteligencia recientes. El jugador parece física y mentalmente estable.",
      "keyTakeaways": "Conclusiones clave:",
      "readOriginal": "Leer fuente original",
      "scoutingDossier": "Dossier de Scouting y Templanza",
      "updated": "Actualizado",
      "coreStrengths": "Fortalezas Clave",
      "noStrengths": "No hay detalles de fortalezas registrados.",
      "developmentAreas": "Áreas de Desarrollo",
      "noWeaknesses": "No hay detalles de vulnerabilidades registrados.",
      "psychologicalProfile": "Perfil Psicológico",
      "defaultMental": "Los indicadores de resiliencia mental son normales. No se generaron alertas de templanza específicas."
    },
    "scouting": {
      "defaultStrengths": "Juego de fondo de élite, potente primer servicio y gran velocidad de desplazamiento lateral.",
      "defaultWeaknesses": "Vulnerable bajo presión al restar el segundo servicio; errores no forzados ocasionales con derechas de bote alto.",
      "defaultMental": "Mantiene altos niveles de concentración. Demuestra una sólida resistencia en los tie-breaks, pero ocasionalmente pierde la compostura al encajar breaks tempranos."
    },
    "playerDropdown": {
      "unknownPlayer": "Jugador Desconocido",
      "searchPlaceholder": "Buscar jugadores por nombre...",
      "noResultsSearch": "No se encontraron jugadores que coincidan con tu búsqueda.",
      "noPlayers": "No hay jugadores disponibles."
    },
    "skillBar": {
      "ariaLabel": "Clasificación de Habilidad"
    },
    "surfaceMastery": {
      "preferredSurface": "Superficie Preferida",
      "specialist": "Especialista en {{surface}}",
      "rating": {
        "average": "Medio",
        "elite": "ÉLITE",
        "strong": "FUERTE",
        "solid": "SÓLIDO",
        "vulnerable": "VULNERABLE",
        "weakness": "DEBILIDAD"
      },
      "matches": "{{count}} PARTIDOS",
      "best": "MEJOR"
    },
    "vegasForm": {
      "quantumEngine": "Motor de Forma Quantum",
      "form": "FORMA",
      "recentForm": "Forma Reciente (Últimos 5)",
      "noMatchRecords": "No se encontraron registros de partidos.",
      "overallWinLoss": "Tasa Global de Victorias / Derrotas",
      "filterSortMatches": "Filtrar y Ordenar Partidos",
      "sort": "Ordenar",
      "newest": "Más Recientes",
      "oldest": "Más Antiguos",
      "matchLog": "Registro de Partidos y Cuotas",
      "showingMatches": "Mostrando {{count}} Partidos",
      "noMatchesFound": "No se encontraron partidos con los filtros seleccionados.",
      "quote": "Cuota",
      "won": "Ganado",
      "lost": "Perdido",
      "partnerOffer": "Oferta Exclusiva de Socio",
      "liveAction": "Acción de Apuestas en Vivo de NEO.bet",
      "partnership": "Asociación",
      "partnerDesc": "Abre una apuesta directamente en NEO.bet para el próximo partido de este jugador. Consigue cuotas premium de ATP/WTA y aprovecha los análisis diarios de IA de Backhand Tennis Line para maximizar tu ventaja.",
      "betLive": "Apostar en Vivo en NEO.bet"
    },
    "mobileMenu": {
      "nav": {
        "tournamentOracle": "Oráculo del Torneo"
      }
    }
  },
  "fr": {
    "courts": {
      "alerts": {
        "invalidBsi": "Évaluation BSI invalide. Doit être comprise entre 1 et 100.",
        "saveError": "Échec de l'enregistrement des détails du court.",
        "deleteConfirm": "Êtes-vous sûr de vouloir supprimer ce court ?",
        "deleteError": "Échec de la suppression du court."
      },
      "loading": "Chargement des données des courts..."
    },
    "loadManagement": {
      "statusText": {
        "fresh": "FRAIS",
        "critical": "CHARGE CRITIQUE",
        "heavy": "JAMBES LOURDES",
        "rhythm": "RYTHME DE MATCH"
      },
      "descriptions": {
        "fresh": "Condition physique optimale. Aucun signe de fatigue attendu.",
        "critical": "Fatigue extrême. Risque massif de baisse de performance en fin de manche.",
        "heavy": "Charge accrue au cours des 2 dernières semaines. Déficit de récupération probable.",
        "rhythm": "Rythme de match parfait. Le joueur est concentré sans être surmené."
      },
      "title": "Statut de Charge Physiologique",
      "timeOnCourt": "Temps sur le Court (14 Derniers Jours)",
      "min": "Min",
      "assessment": "Évaluation de la Charge",
      "comebackRating": "Indice de Comeback",
      "post1stSetLoss": "Après perte du 1er set",
      "statsSummary": "{{wins}}V – {{losses}}D ({{rate}}%)",
      "comebackDesc": "Mesure la capacité du joueur à arracher une victoire après avoir perdu le premier set, calculée à partir de ses récents résultats de match."
    },
    "intelligence": {
      "briefings": "Briefings d'Intelligence IA",
      "viewHub": "Voir le Centre",
      "noAlerts": "Aucune alerte d'intelligence récente trouvée. Le joueur semble physiquement et mentalement stable.",
      "keyTakeaways": "Points clés à retenir :",
      "readOriginal": "Lire la source originale",
      "scoutingDossier": "Dossier de Scouting & Calme",
      "updated": "Mis à jour",
      "coreStrengths": "Forces Clés",
      "noStrengths": "Aucun détail sur les forces enregistré.",
      "developmentAreas": "Axes de Développement",
      "noWeaknesses": "Aucun détail sur les faiblesses enregistré.",
      "psychologicalProfile": "Profil Psychologique",
      "defaultMental": "Les indicateurs de résilience mentale sont standard. Aucune alerte de calme spécifique générée."
    },
    "scouting": {
      "defaultStrengths": "Jeu de fond de court d'élite, premier service puissant et couverture de terrain latérale rapide.",
      "defaultWeaknesses": "Vulnérable sous pression sur le retour de second service ; fautes directes occasionnelles sur les coups droits à haut rebond.",
      "defaultMental": "Maintient un niveau de concentration élevé. Fait preuve d'une solide résilience dans les tie-breaks mais manque parfois de calme face à des breaks rapides."
    },
    "playerDropdown": {
      "unknownPlayer": "Joueur Inconnu",
      "searchPlaceholder": "Rechercher des joueurs par nom...",
      "noResultsSearch": "Aucun joueur trouvé correspondant à votre recherche.",
      "noPlayers": "Aucun joueur disponible."
    },
    "skillBar": {
      "ariaLabel": "Évaluation des Compétences"
    },
    "surfaceMastery": {
      "preferredSurface": "Surface Préférée",
      "specialist": "Spécialiste de {{surface}}",
      "rating": {
        "average": "Moyen",
        "elite": "ÉLITE",
        "strong": "FORT",
        "solid": "SOLIDE",
        "vulnerable": "VULNÉRABLE",
        "weakness": "FAIBLESSE"
      },
      "matches": "{{count}} MATCHS",
      "best": "MEILLEUR"
    },
    "vegasForm": {
      "quantumEngine": "Moteur de Forme Quantum",
      "form": "FORME",
      "recentForm": "Forme Récente (5 Derniers)",
      "noMatchRecords": "Aucun enregistrement de match trouvé.",
      "overallWinLoss": "Taux Global Victoire / Défaite",
      "filterSortMatches": "Filtrer & Trier les Matchs",
      "sort": "Trier",
      "newest": "Plus Récents",
      "oldest": "Plus Anciens",
      "matchLog": "Journal des Matchs & Cotes",
      "showingMatches": "Affichage de {{count}} Matchs",
      "noMatchesFound": "Aucun match trouvé avec les filtres sélectionnés.",
      "quote": "Cote",
      "won": "Gagné",
      "lost": "Perdu",
      "partnerOffer": "Offre Exclusive Partenaire",
      "liveAction": "Paris en Direct NEO.bet",
      "partnership": "Partenariat",
      "partnerDesc": "Placez un pari directement sur NEO.bet pour le prochain match de ce joueur. Profitez de cotes ATP/WTA premium et utilisez nos analyses quotidiennes pour maximiser votre avantage.",
      "betLive": "Parier en Direct sur NEO.bet"
    },
    "mobileMenu": {
      "nav": {
        "tournamentOracle": "Oracle du Tournoi"
      }
    }
  },
  "it": {
    "courts": {
      "alerts": {
        "invalidBsi": "Valutazione BSI non valida. Deve essere compresa tra 1 e 100.",
        "saveError": "Impossibile salvare i dettagli del campo.",
        "deleteConfirm": "Sei sicuro di voler eliminare questo campo?",
        "deleteError": "Impossibile eliminare il campo."
      },
      "loading": "Caricamento dati campi..."
    },
    "loadManagement": {
      "statusText": {
        "fresh": "FRESCO",
        "critical": "CARICO CRITICO",
        "heavy": "GAMBE PESANTI",
        "rhythm": "RITMO PARTITA"
      },
      "descriptions": {
        "fresh": "Condizione fisica ottimale. Non si attendono segni di affaticamento.",
        "critical": "Fatica estrema. Rischio elevato di calo di prestazioni nei set finali.",
        "heavy": "Carico aumentato nelle ultime 2 settimane. Probabile deficit di recupero.",
        "rhythm": "Ritmo partita perfetto. Il giocatore è concentrato senza essere sovraccarico."
      },
      "title": "Stato del Carico Fisiologico",
      "timeOnCourt": "Tempo in Campo (Ultimi 14 Giorni)",
      "min": "Min",
      "assessment": "Valutazione del Carico",
      "comebackRating": "Comeback Rating",
      "post1stSetLoss": "Dopo aver perso il 1° set",
      "statsSummary": "{{wins}}V – {{losses}}P ({{rate}}%)",
      "comebackDesc": "Misura la capacità del giocatore di conquistare la vittoria dopo aver perso il primo set, calcolata in base al suo storico recente di partite."
    },
    "intelligence": {
      "briefings": "Briefing di Intelligenza IA",
      "viewHub": "Vedi Centro",
      "noAlerts": "Nessun avviso di intelligenza recente trovato. Il giocatore appare stabile sia fisicamente che mentalmente.",
      "keyTakeaways": "Punti chiave:",
      "readOriginal": "Leggi la fonte originale",
      "scoutingDossier": "Dossier di Scouting e Compostezza",
      "updated": "Aggiornato",
      "coreStrengths": "Punti di Forza",
      "noStrengths": "Nessun dettaglio sui punti di forza registrato.",
      "developmentAreas": "Aree di Sviluppo",
      "noWeaknesses": "Nessun dettaglio sulle vulnerabilità registrato.",
      "psychologicalProfile": "Profilo Psicologico",
      "defaultMental": "Gli indicatori di resilienza mentale sono nella norma. Nessun avviso di compostezza specifico generato."
    },
    "scouting": {
      "defaultStrengths": "Gioco da fondocampo d'élite, primo servizio potente e ottima velocità nei movimenti laterali.",
      "defaultWeaknesses": "Vulnerabile sotto pressione sulla risposta alla seconda di servizio; occasionali errori non forzati su diritti con rimbalzo alto.",
      "defaultMental": "Mantiene livelli di concentrazione elevati. Dimostra una solida resilienza nei tie-break ma occasionalmente perde la calma in caso di break subiti nelle fasi iniziali."
    },
    "playerDropdown": {
      "unknownPlayer": "Giocatore Sconosciuto",
      "searchPlaceholder": "Cerca giocatori per nome...",
      "noResultsSearch": "Nessun giocatore trovato corrispondente alla ricerca.",
      "noPlayers": "Nessun giocatore disponibile."
    },
    "skillBar": {
      "ariaLabel": "Valutazione Abilità"
    },
    "surfaceMastery": {
      "preferredSurface": "Superficie Preferida",
      "specialist": "Specialista in {{surface}}",
      "rating": {
        "average": "Medio",
        "elite": "ÉLITE",
        "strong": "FORTE",
        "solid": "SOLIDO",
        "vulnerable": "VULNERABILE",
        "weakness": "DEBOLEZZA"
      },
      "matches": "{{count}} PARTITE",
      "best": "MIGLIORE"
    },
    "vegasForm": {
      "quantumEngine": "Forma Quantum Engine",
      "form": "FORMA",
      "recentForm": "Forma Recente (Ultime 5)",
      "noMatchRecords": "Nessun record di partita trovato.",
      "overallWinLoss": "Tasso di Vittorie / Sconfitte Generale",
      "filterSortMatches": "Filtra e Ordina Partite",
      "sort": "Ordina",
      "newest": "Più Recenti",
      "oldest": "Meno Recenti",
      "matchLog": "Registro Partite e Quote",
      "showingMatches": "Visualizzazione di {{count}} Partite",
      "noMatchesFound": "Nessuna partita trovata con i filtri selezionati.",
      "quote": "Quota",
      "won": "Vinto",
      "lost": "Perso",
      "partnerOffer": "Offerta Esclusiva Partner",
      "liveAction": "Scommesse in Diretta NEO.bet",
      "partnership": "Partnership",
      "partnerDesc": "Scommetti direttamente su NEO.bet per il prossimo match di questo giocatore. Blocca quote premium ATP/WTA e sfrutta i nostri dati quotidiani per massimizzare il tuo vantaggio.",
      "betLive": "Scommetti Live su NEO.bet"
    },
    "mobileMenu": {
      "nav": {
        "tournamentOracle": "Oracolo del Torneo"
      }
    }
  }
};

for (const lang of Object.keys(translations)) {
  const file = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(data, translations[lang]);
    
    // Ensure mobileMenu.nav exists
    if (!data.mobileMenu) data.mobileMenu = {};
    if (!data.mobileMenu.nav) data.mobileMenu.nav = {};
    data.mobileMenu.nav.tournamentOracle = translations[lang].mobileMenu.nav.tournamentOracle;

    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully merged translations into ${file}`);
  }
}
