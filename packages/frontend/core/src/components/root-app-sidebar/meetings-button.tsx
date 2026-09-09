import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { MeetingIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarMeetingsButton = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const isMeetings = location.pathname.startsWith('/meetings');

  return (
    <MenuLinkItem
      data-testid="slider-bar-meetings-button"
      active={isMeetings}
      to={'/meetings'}
      icon={<MeetingIcon />}
    >
      Meetings
    </MenuLinkItem>
  );
};
