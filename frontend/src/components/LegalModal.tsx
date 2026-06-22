// src/components/LegalModal.tsx
import { motion } from 'framer-motion';
import { X, FileText, Scale, Cpu, Cookie, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LegalModal({ type, onClose }: { type: string; onClose: () => void }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const isDe = currentLang.startsWith('de');

  const contentMap: Record<
    string,
    {
      title: { en: string; de: string };
      icon: any;
      body: { en: JSX.Element; de: JSX.Element };
    }
  > = {
    privacy: {
      title: {
        en: "Privacy Policy",
        de: "Datenschutzerklärung"
      },
      icon: FileText,
      body: {
        en: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Data Controller & Scope</p>
              <p>BACKHAND.DTL Analytics (Oldenburg, Germany) acts as the primary data controller under Art. 4 No. 7 GDPR. We implement "Privacy by Design" to ensure that your analytical footprints are minimized and anonymized. Our processing is strictly governed by the General Data Protection Regulation (GDPR).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Processing Infrastructure & Payment</p>
              <p>Authentication and high-performance data storage are handled via Supabase (AWS Node Frankfurt), utilizing AES-256 encryption at rest. All subscription and transactional processing is managed by our authorized third-party Merchant of Record (MoR), <strong>Lemon Squeezy</strong>. We do not store, process, or transmit credit card information on our servers. Financial data is strictly subject to Lemon Squeezy's privacy policy.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. Exclusive Data Source (Odds Aggregation)</p>
              <p>Our platform aggregates real-time market data and odds via API exclusively from certified B2B sports data providers (including 1win). We explicitly state that <strong>no user data, IP addresses, or personally identifiable information (PII) is ever shared with, transmitted to, or accessible by our data partners.</strong> The data flow is strictly unidirectional (inbound to our servers).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Advanced Analytics & PostHog</p>
              <p>We utilize PostHog for behavior-based event tracking. This data is strictly used to refine our neural models and BSI accuracy. No personally identifiable betting history or financial strategies are ever harvested, indexed, or shared with third-party advertising networks.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. User Rights & DSA Compliance</p>
              <p>You maintain absolute rights to data portability, rectification, and erasure. Requests are processed within 72 hours via bh.dtl@web.de. We act in accordance with the EU Digital Services Act regarding content moderation and the use of athlete imagery for identifying analytical reports.</p>
            </section>
          </div>
        ),
        de: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Verantwortlicher & Geltungsbereich</p>
              <p>BACKHAND.DTL Analytics (Oldenburg, Deutschland) agiert als primärer Datenverantwortlicher gemäß Art. 4 Nr. 7 DSGVO. Wir implementieren „Privacy by Design“, um sicherzustellen, dass Ihre analytischen Spuren minimiert und anonymisiert werden. Unsere Verarbeitung unterliegt streng der Datenschutz-Grundverordnung (DSGVO).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Verarbeitungsinfrastruktur & Zahlung</p>
              <p>Authentifizierung und Hochleistungs-Datenspeicherung erfolgen über Supabase (AWS-Knoten Frankfurt) unter Verwendung einer AES-256-Verschlüsselung bei Inaktivität. Die gesamte Abonnement- und Transaktionsabwicklung wird durch unseren autorisierten Drittanbieter-Zahlungsdienstleister (Merchant of Record - MoR), <strong>Lemon Squeezy</strong>, verwaltet. Wir speichern, verarbeiten oder übertragen keine Kreditkarteninformationen auf unseren Servern. Finanzdaten unterliegen ausschließlich den Datenschutzbestimmungen von Lemon Squeezy.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. Exklusive Datenquelle (Quoten-Aggregation)</p>
              <p>Unsere Plattform aggregiert Echtzeit-Marktdaten und Quoten über APIs ausschließlich von zertifizierten B2B-Sportdatenanbietern (einschließlich 1win). Wir weisen ausdrücklich darauf hin, dass <strong>zu keinem Zeitpunkt Nutzerdaten, IP-Adressen oder personenbezogene Daten (PII) an unsere Datenpartner weitergegeben, übertragen oder für diese zugänglich gemacht werden.</strong> Der Datenfluss ist rein unidirektional (eingehend auf unsere Server).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Erweiterte Analytik & PostHog</p>
              <p>Wir nutzen PostHog für verhaltensbasiertes Event-Tracking. Diese Daten werden ausschließlich zur Verfeinerung unserer neuronalen Modelle und der BSI-Genauigkeit verwendet. Es werden keine persönlich identifizierbaren Wetthistorien oder finanziellen Strategien erfasst, indexiert oder an Drittanbieter-Werbenetzwerke weitergegeben.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. Nutzerrechte & DSA-Konformität</p>
              <p>Sie haben uneingeschränkte Rechte auf Datenübertragbarkeit, Berichtigung und Löschung. Anfragen werden innerhalb von 72 Stunden über bh.dtl@web.de bearbeitet. Wir handeln im Einklang mit dem Gesetz über digitale Dienste der EU (Digital Services Act - DSA) bezüglich der Moderation von Inhalten und der Verwendung von Bildern von Athleten zur Identifizierung analytischer Berichte.</p>
            </section>
          </div>
        )
      }
    },
    terms: {
      title: {
        en: "Terms of Service",
        de: "Nutzungsbedingungen"
      },
      icon: Scale,
      body: {
        en: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Definitive Non-Financial Advisory</p>
              <p>The information, metrics, and "Alpha" signals provided by BACKHAND.DTL are for educational and analytical purposes only. Statistical probabilities and AI-generated models are NOT guarantees of future performance. Usage of this data is at your own exclusive financial risk. We do not provide financial, legal, or betting advice. Market odds provided by our external data partners are presented "as is" without warranty of accuracy.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Subscriptions, Refunds & Cancellations</p>
              <p>Order processing, tax calculation, and subscription management are conducted by our Merchant of Record, <strong>Lemon Squeezy</strong>. By purchasing a subscription, you enter into a commercial agreement subject to their Terms of Sale. Due to the digital nature of the platform and the immediate delivery of proprietary data, <strong>all sales are final and we do not offer refunds.</strong> You may cancel your subscription at any time; your access will remain active until the end of your currently paid billing period.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. IP Protection & Anti-Scraping Shield</p>
              <p>Our BSI metrics, tactical player profiles, and "Neural Raw Intel" are protected intellectual property. Use of automated bots, scripts, or spiders to extract data from our platform is a breach of contract and will result in immediate termination of the service without refund and legal action for damages.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Notice-and-Takedown Process</p>
              <p>We use imagery of professional athletes solely for the purpose of identifying statistical reports (§ 23 KunstUrhG). If you are a rights holder and identify a violation, we guarantee a removal within 24 hours of notification via our official support channel to bh.dtl@web.de.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. Limitation of Liability & Jurisdiction</p>
              <p>To the maximum extent permitted by law, BACKHAND.DTL’s total liability is limited to the amount paid by the user in the 12 months preceding the claim. These terms are governed by the laws of Germany. The exclusive place of jurisdiction for all commercial disputes arising from this contract is Oldenburg, Germany.</p>
            </section>
          </div>
        ),
        de: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Definitive Nicht-Finanzberatung</p>
              <p>Die von BACKHAND.DTL bereitgestellten Informationen, Kennzahlen und „Alpha“-Signale dienen ausschließlich Bildungs- und Analysezwecken. Statistische Wahrscheinlichkeiten und KI-generierte Modelle sind KEINE Garantien für zukünftige Ergebnisse. Die Nutzung dieser Daten erfolgt auf Ihr eigenes, ausschließliches finanzielles Risiko. Wir bieten keine Finanz-, Rechts- oder Wettberatung an. Marktquoten, die von unseren externen Datenpartnern bereitgestellt werden, werden ohne Mängelgewähr und ohne Gewährleistung für Richtigkeit dargestellt.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Abonnements, Rückerstattungen & Kündigungen</p>
              <p>Die Bestellabwicklung, Steuerberechnung und Abonnementverwaltung werden von unserem Merchant of Record, <strong>Lemon Squeezy</strong>, durchgeführt. Mit dem Kauf eines Abonnements gehen Sie eine Geschäftsvereinbarung ein, die deren Verkaufsbedingungen unterliegt. Aufgrund der digitalen Natur der Plattform und der sofortigen Bereitstellung proprietärer Daten sind <strong>alle Verkäufe endgültig und wir bieten keine Rückerstattungen an.</strong> Sie können Ihr Abonnement jederzeit kündigen; Ihr Zugang bleibt bis zum Ende Ihres bereits bezahlten Abrechnungszeitraums aktiv.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. Schutz des geistigen Eigentums & Anti-Scraping</p>
              <p>Unsere BSI-Metriken, taktischen Spielerprofile und das „Neural Raw Intel“ sind geschütztes geistiges Eigentum. Die Verwendung von automatisierten Bots, Skripten oder Spidern zum Extrahieren von Daten von unserer Plattform stellt einen Vertragsbruch dar und führt zur sofortigen Beendigung des Dienstes ohne Rückerstattung sowie zu rechtlichen Schritten auf Schadensersatz.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Notice-and-Takedown-Verfahren</p>
              <p>Wir verwenden Bilder von professionellen Athleten ausschließlich zum Zweck der Identifizierung statistischer Berichte (§ 23 KunstUrhG). Wenn Sie Rechteinhaber sind und einen Verstoß feststellen, garantieren wir eine Entfernung innerhalb von 24 Stunden nach Benachrichtigung über unseren offiziellen Support-Kanal an bh.dtl@web.de.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. Haftungsbeschränkung & Gerichtsstand</p>
              <p>Soweit gesetzlich zulässig, ist die Gesamthaftung von BACKHAND.DTL auf den Betrag begrenzt, den der Nutzer in den 12 Monaten vor dem Anspruch gezahlt hat. Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland. Ausschließlicher Gerichtsstand für alle kommerziellen Streitigkeiten aus diesem Vertrag ist Oldenburg, Deutschland.</p>
            </section>
          </div>
        )
      }
    },
    ai: {
      title: {
        en: "AI Disclosure",
        de: "KI-Offenlegung"
      },
      icon: Cpu,
      body: {
        en: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Neural Engine Methodology</p>
              <p>Our "Alpha Engine" utilizes high-tier Deep Learning architectures (CNN & Transformers) to process over 140,000 data points per match. This includes visual surface analysis and tactical player profiling. This system does not make automated decisions that have legal effects on users, acting strictly in compliance with the EU AI Act.</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Predictive Limitation & Latency</p>
              <p>While our models aim for high-confidence variances, AI results are statistical estimates. The "BSI" ball physics data is captured through real-time feeds and is subject to local court conditions, environmental variables, and technical latency.</p>
            </section>
          </div>
        ),
        de: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Methodik der Neural-Engine</p>
              <p>Unsere „Alpha-Engine“ nutzt hochmoderne Deep-Learning-Architekturen (CNN & Transformer), um über 140.000 Datenpunkte pro Match zu verarbeiten. Dies umfasst die visuelle Oberflächenanalyse und das taktische Spielerprofiling. Dieses System trifft keine automatisierten Entscheidungen, die rechtliche Auswirkungen auf die Nutzer haben, und arbeitet in strikter Übereinstimmung mit dem KI-Gesetz der EU (EU AI Act).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Prädiktive Einschränkung & Latenz</p>
              <p>Obwohl unsere Modelle auf hochpräzise Varianzen abzielen, sind KI-Ergebnisse statistische Schätzungen. Die „BSI“-Ballphysikdaten werden über Echtzeit-Feeds erfasst und hängen von den Bedingungen vor Ort, Umgebungsvariablen und technischer Latenz ab.</p>
            </section>
          </div>
        )
      }
    },
    cookies: {
      title: {
        en: "Cookie Settings",
        de: "Cookie-Einstellungen"
      },
      icon: Cookie,
      body: {
        en: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Strictly Necessary (Supabase)</p>
              <p>These cookies are critical for session persistence and identity validation. They are encrypted and expire upon logout. Required for the technical operation of the SaaS (TDDDG compliant).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Analytical Logic (PostHog)</p>
              <p>Used to measure conversion paths and dashboard interaction. These cookies do not store personally identifiable betting data or financial strategies and can be opted out via the cookie banner.</p>
            </section>
          </div>
        ),
        de: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Unbedingt erforderlich (Supabase)</p>
              <p>Diese Cookies sind für die Aufrechterhaltung der Sitzung und die Identitätsprüfung unerlässlich. Sie werden verschlüsselt und laufen nach dem Abmelden ab. Erforderlich für den technischen Betrieb des SaaS (TDDDG-konform).</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Analytische Logik (PostHog)</p>
              <p>Wird verwendet, um Konversionspfade und die Interaktion mit dem Dashboard zu messen. Diese Cookies speichern keine persönlich identifizierbaren Wettdaten oder finanziellen Strategien und können über das Cookie-Banner deaktiviert werden.</p>
            </section>
          </div>
        )
      }
    },
    imprint: {
      title: {
        en: "Imprint / Legal",
        de: "Impressum"
      },
      icon: Info,
      body: {
        en: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Provider Identification (§ 5 DDG)</p>
              <p>Phi-Nam Pham<br />Plaggenhau 41<br />26135 Oldenburg<br />Germany</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Contact & SAR</p>
              <p>Email: bh.dtl@web.de<br />Web: backhandtl.com<br />Notice-and-Takedown Office: Oldenburg</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Tax Information & Payment</p>
              <p>Steuernummer (Tax ID): 64/133/09478<br /><em>Payments processed externally via Merchant of Record (Lemon Squeezy).</em></p>
            </section>
          </div>
        ),
        de: (
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Anbieterkennzeichnung (§ 5 DDG)</p>
              <p>Phi-Nam Pham<br />Plaggenhau 41<br />26135 Oldenburg<br />Deutschland</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Kontakt & Anfragen</p>
              <p>E-Mail: bh.dtl@web.de<br />Web: backhandtl.com<br />Notice-and-Takedown-Stelle: Oldenburg</p>
            </section>
            <section>
              <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Steuerliche Informationen & Zahlung</p>
              <p>Steuernummer: 64/133/09478<br /><em>Zahlungen werden extern über den Merchant of Record (Lemon Squeezy) abgewickelt.</em></p>
            </section>
          </div>
        )
      }
    }
  };

  const content = contentMap[type] || contentMap.privacy;
  const activeTitle = isDe ? content.title.de : content.title.en;
  const activeBody = isDe ? content.body.de : content.body.en;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#15171e]/75 backdrop-blur-2xl border border-white/10 w-full max-w-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tennis-lime/10 rounded-lg text-tennis-lime">
              <content.icon size={20} />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">{activeTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} className="text-gray-500 hover:text-white" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {activeBody}
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-tennis-lime transition-all"
          >
            {isDe ? 'Schließen' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}