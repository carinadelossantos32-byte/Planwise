import "./page-header.css";

/*
    The heading bar shared by every feature page, so they all look the same.

    - title
    - children: buttons / search shown on the right
    - footer:   an optional second row inside the bar (Client Records puts its tabs here)
    - flush:    no gap under the bar (the GIS map sits right against it)
*/
function PageHeader({ title, children, footer, flush = false }) {
  return (
    <header className={`page-head${flush ? " page-head--flush" : ""}`}>
      <div className="page-head-row">
        <div className="page-head-title">
          <h1>{title}</h1>
        </div>
        {children && <div className="page-head-actions">{children}</div>}
      </div>
      {footer && <div className="page-head-footer">{footer}</div>}
    </header>
  );
}

export default PageHeader;
