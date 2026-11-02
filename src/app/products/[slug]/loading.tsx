export default function Loading() {
  return (
    <div className="store-loading" style={{ minHeight: "70dvh" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 20px",
            border: "3px solid #e4ded4",
            borderTopColor: "#816334",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p>Loading product...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}