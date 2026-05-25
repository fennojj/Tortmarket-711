import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

interface NDAModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const NDA_TEXT: string = `TORT MARKET CONFIDENTIALITY AGREEMENT

Effective Date: 5/25/2026

This Confidentiality Agreement ("Agreement") is entered into by and between:

Disclosing Party:
John Fenno, Founder/CEO
Pro Bono Legal [LLC/Inc.] d/b/a LawTegic Solutions Media
Tallahassee, FL
john@lawtegic.solutions

and

Receiving Party:
User Accessing Platform

The parties may be referred to individually as a "Party" and collectively as the "Parties."

Purpose
The Parties wish to discuss a potential business, investment, sponsorship, media, advisory, development, partnership, marketing, beta testing, licensing, integration, or commercial relationship relating to Tort Market / Tort Site, including a mass tort forecasting, engagement, campaign automation, rewards, sponsorship, and legal-technology platform.

The purpose of this Agreement is to allow confidential discussions while protecting non-public information.

Confidential Information
"Confidential Information" means any non-public information disclosed by the Disclosing Party to the Receiving Party, whether disclosed orally, visually, electronically, in writing, through a demo, through app access, through screenshots, through messages, through decks, through files, through code, or through other materials.

Confidential Information includes, without limitation:
(a) product concepts, app screens, demos, beta features, market concepts, user flows, workflows, roadmaps, launch plans, and business plans;
(b) software, source code, object code, APIs, databases, prompts, AI systems, models, algorithms, scoring systems, technical architecture, backend systems, and product designs;
(c) Tort Market features including the Hedge Simulator, TortSearch, AI Coach, Campaign Agent, prediction-alert gateway, market auto-creation, leaderboards, rewards, sponsor systems, alerts, user engagement systems, and app deployment strategy;
(d) patent applications, invention disclosures, provisional patent materials, drawings, claims, trade secrets, know-how, technical descriptions, and intellectual property strategies;
(e) sponsor concepts, reward structures, pricing, business models, partner lists, investor materials, user growth data, analytics, conversion data, marketing plans, campaign copy, and commercial terms.

Exclusions
Confidential Information does not include information that the Receiving Party can show:
(a) was publicly known through no fault of the Receiving Party;
(b) was already lawfully known by the Receiving Party before disclosure;
(c) was independently developed without using the Disclosing Party's Confidential Information;
(d) was lawfully received from a third party without a confidentiality obligation; or
(e) must be disclosed by law, court order, subpoena, or governmental authority, provided that the Receiving Party gives prompt notice to the Disclosing Party when legally permitted.

Receiving Party Obligations
The Receiving Party agrees to:
(a) use Confidential Information only for evaluating or pursuing the relationship described in this Agreement;
(b) not disclose Confidential Information to any third party without written permission;
(c) protect Confidential Information using reasonable care and at least the same care used to protect its own confidential information;
(d) limit access to employees, contractors, advisors, attorneys, accountants, investors, or representatives who need to know the information for the stated purpose and who are bound by confidentiality duties at least as protective as this Agreement;
(e) not copy, publish, post, distribute, scrape, reverse engineer, decompile, train models on, commercially exploit, or use Confidential Information to create a competing product without written permission;
(f) promptly notify the Disclosing Party of any unauthorized access, use, or disclosure.

Intellectual Property
All Confidential Information remains the property of the Disclosing Party.
No license, assignment, ownership interest, or other intellectual property right is granted by this Agreement except the limited right to review and use Confidential Information for the stated purpose.
The Receiving Party may not file, assist in filing, claim ownership of, or otherwise exploit any patent, copyright, trademark, trade secret, software, business method, algorithm, workflow, app concept, or other intellectual property based on the Disclosing Party's Confidential Information.

No Public Announcement
The Receiving Party may not publicly announce, post, publish, market, advertise, or imply any relationship with Tort Market or the Disclosing Party without prior written permission.

Media and Press
If the Receiving Party is a journalist, media outlet, podcast host, newsletter writer, blogger, influencer, or content creator, all non-public information is provided for confidential background purposes only unless the Disclosing Party expressly agrees in writing that specific information may be published.

Sponsors and Commercial Partners
If the Receiving Party is a sponsor, advertiser, partner, affiliate, or commercial prospect, Confidential Information includes sponsor pricing, reward concepts, promotional strategy, campaign workflows, user growth data, engagement data, conversion data, and commercial terms.

Investors and Advisors
If the Receiving Party is an investor, advisor, consultant, or prospective investor, Confidential Information may be used only to evaluate a potential investment, advisory, financing, or business relationship.

Contractors, Developers, and Vendors
If the Receiving Party performs design, development, engineering, marketing, AI, data, campaign, legal-tech, or technical work for Tort Market, a separate contractor, work-for-hire, or intellectual property assignment agreement may be required before work begins.

Return or Destruction
Upon written request, the Receiving Party will return or destroy Confidential Information, including copies, screenshots, files, notes, and extracts, except that one archival copy may be retained solely for legal, compliance, or backup purposes.

Term
This Agreement begins on the Effective Date and continues for three (3) years.

No Obligation to Proceed
Nothing in this Agreement requires either Party to proceed with any investment, sponsorship, partnership, media feature, development work, licensing arrangement, advisory relationship, or other transaction.

No Warranty
Confidential Information is provided "as is." The Disclosing Party makes no representation or warranty regarding accuracy, completeness, commercial value, patentability, availability, or future performance.

Remedies
The Receiving Party acknowledges that unauthorized use or disclosure of Confidential Information may cause irreparable harm. The Disclosing Party may seek injunctive relief, damages, and any other remedies available under law or equity.

Governing Law
This Agreement is governed by the laws of the State of Florida without regard to conflict-of-law principles.

Entire Agreement
This Agreement is the entire agreement between the Parties regarding confidentiality and supersedes prior discussions about confidentiality. Any amendment must be in writing and accepted by both Parties.

Electronic Acceptance
By clicking "I Agree & Enter", the Receiving Party electronically assents to these terms.

AGREED:
Disclosing Party: John Fenno, Founder/CEO, Pro Bono Legal [LLC/Inc.] d/b/a LawTegic Solutions Media. Execution: Pre-approved.
Receiving Party: User. Execution: Acknowledged via clickwrap acceptance.`;

export default function NDAModal({
  visible,
  onClose,
  onAgree,
}: NDAModalProps): React.ReactElement {
  const handleAgree = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onAgree();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="nda-modal"
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="nda-backdrop">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.headline}>One quick thing...</Text>
          <Text style={styles.subtext}>
            To view proprietary features like the Hedge Simulator and TortCoach, please accept
            our standard confidentiality agreement.
          </Text>

          <View style={styles.scrollBox}>
            <ScrollView
              style={styles.scrollInner}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <Text style={styles.ndaText}>{NDA_TEXT}</Text>
            </ScrollView>
          </View>

          <Pressable
            onPress={handleAgree}
            style={styles.cta}
            testID="nda-agree"
          >
            <Text style={styles.ctaText}>I Agree & Enter</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "60%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 24,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginBottom: 14,
  },
  headline: {
    color: "#0B1220",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtext: {
    color: "rgba(11,18,32,0.65)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  scrollBox: {
    flex: 1,
    minHeight: 200,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  scrollInner: { flex: 1 },
  scrollContent: { padding: 14 },
  ndaText: {
    color: "#1F2937",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
  },
  cta: {
    marginTop: 14,
    alignSelf: "stretch",
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
