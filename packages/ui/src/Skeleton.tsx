export function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="加载中">
      <div className="skeleton__line" />
      <div className="skeleton__line skeleton__line--short" />
      <div className="skeleton__block" />
    </div>
  );
}
