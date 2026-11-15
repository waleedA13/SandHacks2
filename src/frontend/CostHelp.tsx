// General cost help. No numbers except the therapist's own posted price:
// we can't know anyone's deductible or out-of-network allowance.
export function CostHelp({
  insurer,
  name,
  price,
}: {
  insurer: string;
  name: string;
  // priceText output, or null when no price is posted.
  price: string | null;
}) {
  return (
    <section className="panel cost" aria-labelledby="cost-h">
      <h2 id="cost-h">What it might cost</h2>
      {price ? (
        <div>
          <p className="price">Their posted price: {price}</p>
          <p className="muted">
            {
              "This is the therapist's own price if you pay yourself. It is not what your insurance charges."
            }
          </p>
        </div>
      ) : (
        <p className="muted">No price posted</p>
      )}
      <p>
        {`With ${insurer}: if they're in your network, you usually pay a copay or part of the fee after your deductible. If they're not, you may pay the full fee and claim some back.`}
      </p>
      <div className="say">
        <p>Ask {insurer} (the number is on your card):</p>
        <ul>
          <li>Is {name} in network for my plan?</li>
          <li>{"What's my copay for therapy?"}</li>
          <li>How much of my deductible is left?</li>
        </ul>
      </div>
      <p>
        Paying yourself? You have the right to a written Good Faith Estimate of
        the cost before your first session.
      </p>
    </section>
  );
}
