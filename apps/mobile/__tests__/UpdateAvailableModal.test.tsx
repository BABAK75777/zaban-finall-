import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { getTheme } from '../src/theme/themes';
import { UpdateAvailableModal } from '../src/ui/UpdateAvailableModal';
import { READING_TEST_IDS } from '../src/ui/testIds';

describe('UpdateAvailableModal', () => {
  const theme = getTheme('light');

  it('dismisses when X is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <UpdateAvailableModal
        visible
        theme={theme}
        message="A newer version of Mamlio is available."
        updateUrl="https://play.google.com/store/apps/details?id=com.babakworks.mamlio"
        onClose={onClose}
        onUpdate={jest.fn()}
      />
    );

    fireEvent.press(getByTestId(READING_TEST_IDS.updateModalClose));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens update URL when Update is pressed', () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const url = 'https://play.google.com/store/apps/details?id=com.babakworks.mamlio';
    const { getByTestId } = render(
      <UpdateAvailableModal
        visible
        theme={theme}
        message="Update ready"
        updateUrl={url}
        onClose={jest.fn()}
        onUpdate={(updateUrl) => {
          void Linking.openURL(updateUrl);
        }}
      />
    );

    fireEvent.press(getByTestId(READING_TEST_IDS.updateModalUpdate));
    expect(openUrl).toHaveBeenCalledWith(url);
  });

  it('disables update action when URL is missing', () => {
    const onUpdate = jest.fn();
    const { getByTestId, getByText } = render(
      <UpdateAvailableModal
        visible
        theme={theme}
        message="Update ready"
        updateUrl={null}
        onClose={jest.fn()}
        onUpdate={onUpdate}
      />
    );

    expect(getByText('Update link not available')).toBeTruthy();
    fireEvent.press(getByTestId(READING_TEST_IDS.updateModalUpdate));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
