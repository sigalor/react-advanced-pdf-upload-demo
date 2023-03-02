import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import Spinner from 'react-spinner-material';
import { Slide, toast, ToastContainer } from 'react-toastify';
import download from 'downloadjs';

import AdvancedPdfUpload from 'react-advanced-pdf-upload';

const OuterContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

const InnerContainer = styled.div`
  width: calc(min(50rem, 100vw));
  border: 1px solid black;
  padding: 2rem;
`;

export default () => {
  const finalizeButtonRef = useRef(null);
  const [finalizeButtonLoading, setFinalizeButtonLoading] = useState(false);
  const [finalizeButtonDisabled, setFinalizeButtonDisabled] = useState(false);

  return (
    <>
      <OuterContainer>
        <InnerContainer>
          <h1>react-advanced-pdf-upload</h1>
          <AdvancedPdfUpload
            components={{
              dropzonePlaceholder: <p>Drag and drop PDF files here or click to select files.</p>,
              loading: <Spinner />,
              uploadedPagesHeading: (
                <>
                  <h2 style={{ marginBottom: 0 }}>Uploaded pages</h2>
                  <small style={{ marginBottom: '1rem' }}>
                    <i>You can change the page order here or remove or rotate pages.</i>
                  </small>
                </>
              ),
              pageNumber: ({ n }) => <i>{n}</i>,
            }}
            finalizeButton={{
              ref: finalizeButtonRef,
              setLoading: setFinalizeButtonLoading,
              setDisabled: setFinalizeButtonDisabled,
            }}
            previewResolution={100}
            previewAreaHeight={300}
            previewAreaPadding={24}
            previewSpacing={40}
            previewControlsHeight={50}
            loadPreviews={async data => {
              const res = await fetch('http://localhost:3001/render-pdf', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }).catch(e => toast.error(e.message));

              if (res && res.status >= 200 && res.status < 299) {
                return await res.json();
              } else {
                toast.error(res.statusText);
              }
            }}
            buildPdf={async data => {
              const res = await fetch('http://localhost:3001/build-pdf', {
                method: 'POST',
                headers: {
                  Accept: 'application/pdf',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }).catch(e => toast.error(e.message));

              if (res && res.status >= 200 && res.status < 299) {
                download(await res.blob(), data.name, 'application/pdf');
              } else {
                toast.error(res.statusText);
              }

              return 'resetLoading';
            }}
          />
          <button
            ref={finalizeButtonRef}
            disabled={finalizeButtonLoading || finalizeButtonDisabled}
            style={{ marginTop: '0.5rem' }}
          >
            {finalizeButtonLoading ? 'Loading...' : 'Finalize'}
          </button>
        </InnerContainer>
      </OuterContainer>
      <ToastContainer position="bottom-left" transition={Slide} />
    </>
  );
};
