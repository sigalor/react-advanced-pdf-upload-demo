import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';
import { X } from 'react-feather';
import Draggable from 'react-draggable';

const Dropzone = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  height: 10rem;
  border-width: 2px;
  border-radius: 2px;
  border-color: #eeeeee;
  border-style: dashed;
  background-color: #fafafa;
  color: #bdbdbd;
  outline: none;
  transition: border 0.24s ease-in-out;

  &:focus,
  &.drag-active {
    border-color: #2196f3;
  }
`;

const UploadedPages = styled.div`
  user-select: none;
  overflow-x: scroll;
`;

const UploadedPagesInner = styled.div`
  height: 100%;
  position: relative;
`;

const UploadedPage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: fit-content;

  &.dragging {
    z-index: 1000;
  }

  &:not(.dragging) {
    transition: transform 0.3s;
  }

  &.dragging > div {
    transform: scale(1.1);
    opacity: 0.9;
  }

  &.last-dragged {
    z-index: 999;
  }

  &.disappeared > div {
    transform: scale(0);
    opacity: 0;
  }
`;

const UploadedPageInner = styled.div`
  position: relative;
  width: fit-content;
  height: fit-content;
  transition: transform 0.3s, opacity 0.25s;

  & > img {
    transition: box-shadow 0.3s, filter 0.3s, height 0.3s;
    box-shadow: 0 0 0.8rem rgba(0, 0, 0, 0.1);
  }

  & > img:hover {
    box-shadow: 0 0 1rem rgba(0, 0, 0, 0.1);
    filter: brightness(105%);
  }
`;

const PageRemoveButton = styled.div`
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 100%;
  background-color: rgb(207, 49, 57);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s;
  cursor: pointer;

  &:hover {
    background-color: rgb(166, 39, 45);
  }
`;

function readFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = error => {
      reject(error);
    };
  });
}

function getPageDimensions(buildPdfData, pageOrIdx) {
  if (typeof pageOrIdx === 'number') pageOrIdx = buildPdfData.pages[pageOrIdx];
  return buildPdfData.files[pageOrIdx.origin.file].previews[pageOrIdx.origin.page].dimensions;
}

function getMaxPreviewHeight(buildPdfData) {
  return Math.max(...buildPdfData.pages.map(p => getPageDimensions(buildPdfData, p).height));
}

function calculatePreviewDimensions(buildPdfData, previewAreaHeight) {
  const maxPreviewHeight = getMaxPreviewHeight(buildPdfData);

  return buildPdfData.pages.map(p => {
    const pageDims = getPageDimensions(buildPdfData, p);
    const height = (pageDims.height / maxPreviewHeight) * previewAreaHeight;
    const width = (pageDims.width / pageDims.height) * height;
    return { width, height };
  });
}

function calculatePreviewPosition(previewDimensions, pageIdx, previewAreaHeight, previewSpacing) {
  let x = 0;

  for (let i = 0; i < pageIdx; i++) {
    x += previewDimensions[i].width;
    x += previewSpacing;
  }

  return { x, y: (previewAreaHeight - previewDimensions[pageIdx].height) / 2 };
}

export default ({
  components,
  loadPreviews,
  previewResolution = 100,
  previewAreaHeight = 240,
  previewAreaPadding = 16,
  previewSpacing = 24,
  scrollbarHeight = 12,
}) => {
  const actualPreviewAreaHeight = previewAreaHeight - previewAreaPadding * 2 - scrollbarHeight;
  const [buildPdfData, setBuildPdfData] = useState({ files: [], pages: [] });
  const maxPreviewHeight = getMaxPreviewHeight(buildPdfData);

  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [pageIdxDragging, setPageIdxDragging] = useState(undefined);
  const [lastPageIdxDragged, setLastPageIdxDragged] = useState(undefined);

  const onDrop = useCallback(
    async acceptedFiles => {
      setPreviewsLoading(true);
      const newFiles = [...buildPdfData.files];
      const newPages = [...buildPdfData.pages];

      for (let fileIdx = 0; fileIdx < acceptedFiles.length; fileIdx++) {
        const file = acceptedFiles[fileIdx];
        const fileBase64 = await readFileToBase64(file);

        const previews = (await loadPreviews({ file: fileBase64, resolution: previewResolution })).pages;
        if (previews) {
          newFiles.push({ pdf: fileBase64, previews });
          for (let pageIdx = 0; pageIdx < previews.length; pageIdx++) {
            newPages.push({
              origin: { file: buildPdfData.files.length + fileIdx, page: pageIdx },
              modifications: [],
              position: { x: 0, y: 0 },
              disappeared: true,
            });
          }
        }
      }

      const newBuildPdfData = { files: newFiles, pages: newPages };
      const previewDimensions = calculatePreviewDimensions(newBuildPdfData, actualPreviewAreaHeight);
      for (let i = 0; i < newPages.length; i++) {
        newPages[i].position = calculatePreviewPosition(previewDimensions, i, actualPreviewAreaHeight, previewSpacing);
      }

      setBuildPdfData(newBuildPdfData);
      setPreviewsLoading(false);

      setTimeout(() => {
        setBuildPdfData({ files: newFiles, pages: newPages.map(p => ({ ...p, disappeared: false })) });
      }, 10);
    },
    [buildPdfData, loadPreviews, previewResolution, actualPreviewAreaHeight, previewSpacing],
  );

  const { isDragActive, getRootProps, getInputProps } = useDropzone({
    accept: 'application/pdf',
    disabled: previewsLoading,
    onDrop,
  });

  const calculatedPreviewDimensions = calculatePreviewDimensions(buildPdfData, actualPreviewAreaHeight);
  const calculatedPreviewPositions = buildPdfData.pages.map((_, pageIdx) =>
    calculatePreviewPosition(calculatedPreviewDimensions, pageIdx, actualPreviewAreaHeight, previewSpacing),
  );
  const calculatedPreviewMidpoints = buildPdfData.pages.map(
    (_, pageIdx) => calculatedPreviewPositions[pageIdx].x + calculatedPreviewDimensions[pageIdx].width / 2,
  );

  return (
    <>
      <Dropzone
        {...getRootProps({ className: (previewsLoading ? 'disabled' : '') + (isDragActive ? ' drag-active' : '') })}
      >
        <input {...getInputProps()} />
        {previewsLoading ? components.loading ?? null : components.dropzonePlaceholder ?? null}
      </Dropzone>
      {components.uploadedPagesHeading ?? null}
      <UploadedPages style={{ height: previewAreaHeight + 'px', padding: previewAreaPadding + 'px' }}>
        <UploadedPagesInner>
          {buildPdfData.pages.map((page, pageIdx) => {
            const preview = buildPdfData.files[page.origin.file].previews[page.origin.page];
            const calculatedPosition = calculatedPreviewPositions[pageIdx];

            return (
              <Draggable
                key={JSON.stringify(page.origin)}
                axis="x"
                position={pageIdxDragging === pageIdx ? page.position : calculatedPosition}
                onDrag={(e, position) => {
                  const newPosition = { x: position.x, y: calculatedPosition.y };
                  const newMidpoint = position.x + calculatedPreviewDimensions[pageIdx].width / 2;
                  const newPages = buildPdfData.pages.map((p, i) =>
                    i === pageIdx ? { ...p, position: newPosition } : p,
                  );

                  // look for the leftmost preview whose midpoint has been exceeded while moving to the left hand side
                  let newPageIdxDragging;
                  for (let i = 0; i < pageIdx; i++) {
                    if (calculatedPreviewMidpoints[i] > newMidpoint) {
                      const [currentPage] = newPages.splice(pageIdx, 1);
                      newPages.splice(i, 0, currentPage);
                      newPageIdxDragging = i;
                      break;
                    }
                  }

                  // if no such preview was found, look for the rightmost one
                  if (newPageIdxDragging === undefined) {
                    for (let i = buildPdfData.pages.length - 1; i > pageIdx; i--) {
                      if (calculatedPreviewMidpoints[i] < newMidpoint) {
                        const [currentPage] = newPages.splice(pageIdx, 1);
                        newPages.splice(i, 0, currentPage);
                        newPageIdxDragging = i;
                        break;
                      }
                    }
                  }

                  if (newPageIdxDragging !== undefined) {
                    setPageIdxDragging(newPageIdxDragging);
                  }
                  setBuildPdfData({
                    files: buildPdfData.files,
                    pages: newPages,
                  });
                }}
                onStart={() => {
                  setBuildPdfData({
                    files: buildPdfData.files,
                    pages: buildPdfData.pages.map((p, i) =>
                      i === pageIdx ? { ...p, position: calculatedPosition } : p,
                    ),
                  });
                  setPageIdxDragging(pageIdx);
                }}
                onStop={() => {
                  setPageIdxDragging(undefined);
                  setLastPageIdxDragged(pageIdx);
                }}
              >
                <UploadedPage
                  style={{ cursor: pageIdxDragging === pageIdx ? 'move' : 'auto' }}
                  className={
                    (pageIdxDragging === pageIdx ? 'dragging' : '') +
                    ' ' +
                    (lastPageIdxDragged === pageIdx ? 'last-dragged' : '') +
                    ' ' +
                    (page.disappeared ? 'disappeared' : '')
                  }
                >
                  <UploadedPageInner>
                    <img
                      alt=""
                      src={preview.uri}
                      style={{
                        height: (preview.dimensions.height / maxPreviewHeight) * actualPreviewAreaHeight + 'px',
                      }}
                      draggable="false"
                    />
                    <PageRemoveButton
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => {
                        setBuildPdfData({
                          files: buildPdfData.files,
                          pages: buildPdfData.pages.map((p, i) => (i === pageIdx ? { ...p, disappeared: true } : p)),
                        });

                        setTimeout(
                          () =>
                            setBuildPdfData({
                              files: buildPdfData.files,
                              pages: buildPdfData.pages.filter((_, i) => i !== pageIdx),
                            }),
                          300,
                        );
                      }}
                    >
                      <X color="white" size="1rem" />
                    </PageRemoveButton>
                  </UploadedPageInner>
                </UploadedPage>
              </Draggable>
            );
          })}
        </UploadedPagesInner>
      </UploadedPages>
    </>
  );
};
