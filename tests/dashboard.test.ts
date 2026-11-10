import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ExperimentResults} from '../components/experiment-results.tsx';
const results = [
 {variant:'worksheet',visitors:20,signups:8,museums:3,visitor_signups:4,educators:1,other:0,paid:2,very_interested:3,converted:5},
 {variant:'mobile',visitors:0,signups:2,museums:0,visitor_signups:2,educators:0,other:0,paid:0,very_interested:0,converted:0},
 {variant:'device',visitors:10,signups:0,museums:0,visitor_signups:0,educators:0,other:0,paid:0,very_interested:0,converted:0},
];
test('concept comparison uses matched conversions and keeps unassigned signups separate', () => {
 const html=renderToStaticMarkup(createElement(ExperimentResults,{results,totalSignups:13}));
 assert.match(html,/25\.0%/);
 assert.doesNotMatch(html,/40\.0%|Infinity|NaN/);
 assert.match(html,/5 of 20 tracked browsers/);
 assert.match(html,/3 signups without an experiment assignment/);
 for (const label of ['Worksheet + audio guide','Mobile phone RPG','Dedicated device RPG']) assert.ok(html.includes(label));
 assert.match(html,/No tracked visits yet/);
 assert.match(html,/0\.0%/);
});
test('unavailable experiment metrics are not presented as zero results', () => {
 const html=renderToStaticMarkup(createElement(ExperimentResults,{totalSignups:13}));
 assert.match(html,/Experiment metrics unavailable/);
 assert.doesNotMatch(html,/13 signups without/);
});

test('pricing comparison separates offers and uses matched museum conversions', async () => {
 const {PricingResults} = await import('../components/pricing-results.tsx');
 const html = renderToStaticMarkup(createElement(PricingResults, {results: [
  {variant:'mobile',pricing_variant:'inquiry',visitors:10,museums:8,paid:2,converted:3},
  {variant:'device',pricing_variant:'pilot',visitors:0,museums:2,paid:1,converted:0},
 ]}));
 assert.match(html,/30\.0% \(3\/10\)/);
 assert.doesNotMatch(html,/80\.0%|Infinity|NaN/);
 assert.match(html,/A · Collaboration/);
 assert.match(html,/B · \$1,000 \/ 30 days/);
 assert.match(html,/Museum handheld RPG/);
 const unavailable = renderToStaticMarkup(createElement(PricingResults));
 assert.match(unavailable,/Pricing metrics unavailable/);
 assert.doesNotMatch(unavailable,/<tbody>/);
});
