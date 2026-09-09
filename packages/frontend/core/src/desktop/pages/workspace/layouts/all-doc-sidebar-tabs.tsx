import { Scrollable } from '@affine/component';
import { MeetingsPanel } from '@affine/core/modules/meetings';
import { ViewSidebarTab } from '@affine/core/modules/workbench';
import { MeetingIcon, TodayIcon } from '@blocksuite/icons/rc';

import { sidebarScrollArea } from '../detail-page/detail-page.css';
import { EditorJournalPanel } from '../detail-page/tabs/journal';

export const AllDocSidebarTabs = () => {
  return (
    <>
      <ViewSidebarTab tabId="all-docs-meetings" icon={<MeetingIcon />}>
        <Scrollable.Root className={sidebarScrollArea}>
          <Scrollable.Viewport>
            <MeetingsPanel />
          </Scrollable.Viewport>
          <Scrollable.Scrollbar />
        </Scrollable.Root>
      </ViewSidebarTab>
      <ViewSidebarTab tabId="all-docs-journal" icon={<TodayIcon />}>
        <Scrollable.Root className={sidebarScrollArea}>
          <Scrollable.Viewport>
            <EditorJournalPanel />
          </Scrollable.Viewport>
          <Scrollable.Scrollbar />
        </Scrollable.Root>
      </ViewSidebarTab>
    </>
  );
};
