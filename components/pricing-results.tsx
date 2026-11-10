export type PricingResult = {variant: string; pricing_variant: string; visitors: number; museums: number; paid: number; converted: number};
export function PricingResults({results}: {results?: PricingResult[]}) {
  return <section className="data-card experiment-results" aria-labelledby="pricing-heading">
    <p className="eyebrow">A / B · MUSEUM PRICING EXPERIMENT</p>
    <h2 id="pricing-heading">Museum inquiries by offer</h2>
    <p>Compare the two offers within each concept. A requests collaboration and quotations; B offers museums and galleries a 30-day exhibition pilot at their venue for $1,000.</p>
    {results ? <div className="experiment-scroll" role="region" aria-label="Museum pricing comparison" tabIndex={0}><table>
      <caption>Museum-pricing-v1 · selected dates and campaign</caption>
      <thead><tr><th scope="col">Concept</th><th scope="col">Offer</th><th scope="col">Tracked browsers</th><th scope="col">Museum inquiries</th><th scope="col">Paid pilot: yes</th><th scope="col">Tracked museum conversion</th></tr></thead>
      <tbody>{results.map(row => <tr key={`${row.variant}-${row.pricing_variant}`}>
        <th scope="row">{row.variant === 'mobile' ? 'Mobile phone RPG' : 'Museum handheld RPG'}</th>
        <td>{row.pricing_variant === 'inquiry' ? 'A · Collaboration & quotation' : 'B · $1,000 / 30 days'}</td>
        <td>{row.visitors}</td><td>{row.museums}</td><td>{row.paid}</td>
        <td>{row.visitors ? `${(100 * row.converted / row.visitors).toFixed(1)}% (${row.converted}/${row.visitors})` : '—'}</td>
      </tr>)}</tbody>
    </table></div> : <p role="status">Pricing metrics unavailable. Apply the museum pricing database migration.</p>}
    <p className="muted">Conversion matches consented browsers to museum submissions for the same concept, offer, dates, and campaign. The denominator includes all tracked browsers; their audience is unknown until signup. Inquiries include people who declined analytics. Historical signups are excluded. These are expressions of interest, not purchases. Compare randomized traffic separately from direct outreach links using campaign filters.</p>
  </section>;
}
