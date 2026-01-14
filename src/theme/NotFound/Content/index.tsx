import React, { type ReactNode } from "react";
import clsx from "clsx";
import type { Props } from "@theme/NotFound/Content";
import Heading from "@theme/Heading";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

export default function NotFoundContent({ className }: Props): ReactNode {
  const location = useLocation();
  const dashboardPathname = (location?.pathname ?? "").replace(
    "/boss-dashboard-guide",
    ""
  );
  const dashboardServiceUrl = "https://admin.pojangboss.com";

  return (
    <main className={clsx("container margin-vert--xl", className)}>
      <div className="row">
        <div className="col col--6 col--offset-3">
          <Heading as="h1" className="hero__title">
            이용 가이드를 찾을 수 없어요
          </Heading>
          <p className="margin-top--md">
            아래 주소에 대한 가이드를 접근하셨는데,{" "}
            <b>가이드가 아직 생성되지 않았거나</b>{" "}
            <b>경로가 올바르지 않을 수 있어요.</b>
          </p>

          <div className="margin-top--md">
            <div className="alert alert--secondary" role="alert">
              <div style={{ fontSize: 12, opacity: 0.8 }}>요청하신 경로</div>
              <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {dashboardPathname}
              </div>
            </div>
          </div>

          <ul className="margin-top--md">
            <li>
              접근하신 경로가 포장보스 어드민(이하 서비스) 페이지에 있는
              경로인지 확인해 주세요.("{dashboardServiceUrl}" 이후에 있는
              텍스트인지 확인)
            </li>
            <li>
              서비스에는 존재하지만 가이드 문서가 아직 준비되지 않았을 수
              있어요.
            </li>
            <li>
              가이드가 필요하다고 판단되는 페이지라면 IT 그룹에 요청해주세요.
            </li>
            <li>
              가이드 홈으로 이동하셔서 원하는 페이지를 찾아보는 것도 좋아요.
            </li>
          </ul>

          <div
            className="margin-top--lg"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Link className="button button--primary" to="/">
              가이드 홈으로
            </Link>
            <Link
              className="button button--outline button--secondary"
              to={dashboardServiceUrl}
            >
              서비스로 이동
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
