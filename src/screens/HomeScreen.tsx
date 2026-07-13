import { t } from "../i18n";

export function HomeScreen() {
  return (
    <section>
      <h1>{t("home.heading")}</h1>
      <p>{t("home.intro")}</p>
      <p>{t("home.offline")}</p>
    </section>
  );
}
