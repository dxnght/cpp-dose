// Card-level containment for assertRenderable()'s fail-closed throw
// (Constitution Art. III). `compile:field` is the primary guarantee that
// only VERIFIED/engineering records ever reach the shipped bundle —
// assertRenderable() calls in DrugCard/ProphylaxisCard are defense in depth
// for that guarantee. Before this boundary existed, an uncaught throw there
// unmounted the *entire* React tree (there was nowhere else for it to go),
// which contradicts Art. III's "show nothing, with a reason — just for that
// item": one bad record could blank the whole app, including any other
// still-valid content on screen. Scoping a boundary per card means a single
// bad record degrades to an inline "hidden, pending review" message instead.
// 2026-07-22, UX review finding (field-ergonomics lens).
import { Component, type ReactNode } from "react";
import { t } from "../i18n";

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

export class ClinicalRecordBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error(
      "ClinicalRecordBoundary caught a render-time throw (fail-closed, Art. III):",
      error,
    );
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="record-pending" role="status">
          {t("record.hidden")}
        </div>
      );
    }
    return this.props.children;
  }
}
