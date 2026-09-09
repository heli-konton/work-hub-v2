import { Scrollable } from '@affine/component';
import { MeetingsPanel } from '@affine/core/modules/meetings';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';

import * as styles from './index.css';

export const Component = () => {
  return (
    <>
      <ViewHeader>
        <ViewIcon icon="meetings" />
        <ViewTitle title="Meetings" />
      </ViewHeader>
      <ViewBody>
        <Scrollable.Root className={styles.scroll}>
          <Scrollable.Viewport>
            <MeetingsPanel />
          </Scrollable.Viewport>
          <Scrollable.Scrollbar />
        </Scrollable.Root>
      </ViewBody>
    </>
  );
};
