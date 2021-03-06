/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
}

const fixedPageSize: number = 8;

export const SearchSelection: FC<SearchSelectionProps> = ({ onSearchSelected }) => (
  <>
    <EuiModalHeader>
      <EuiModalHeaderTitle>
        <FormattedMessage
          id="xpack.transform.newTransform.newTransformTitle"
          defaultMessage="New transform"
        />{' '}
        /{' '}
        <FormattedMessage
          id="xpack.transform.newTransform.chooseSourceTitle"
          defaultMessage="Choose a source"
        />
      </EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <SavedObjectFinder
        key="searchSavedObjectFinder"
        onChoose={onSearchSelected}
        showFilter
        noItemsMessage={i18n.translate(
          'xpack.transform.newTransform.searchSelection.notFoundLabel',
          {
            defaultMessage: 'No matching indices or saved searches found.',
          }
        )}
        savedObjectMetaData={[
          {
            type: 'search',
            getIconForSavedObject: () => 'search',
            name: i18n.translate(
              'xpack.transform.newTransform.searchSelection.savedObjectType.search',
              {
                defaultMessage: 'Saved search',
              }
            ),
          },
          {
            type: 'index-pattern',
            getIconForSavedObject: () => 'indexPatternApp',
            name: i18n.translate(
              'xpack.transform.newTransform.searchSelection.savedObjectType.indexPattern',
              {
                defaultMessage: 'Index pattern',
              }
            ),
          },
        ]}
        fixedPageSize={fixedPageSize}
      />
    </EuiModalBody>
  </>
);
