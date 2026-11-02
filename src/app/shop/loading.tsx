export default function Loading() {
  return (
    <div className="shell products-section" style={{ minHeight: "70dvh" }}>
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div
          style={{
            width: 50,
            height: 50,
            margin: "0 auto 20px",
            border: "3px solid #e4ded4",
            borderTopColor: "#816334",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p>Loading collection...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}