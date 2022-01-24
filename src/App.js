import React from 'react';
import styled from 'styled-components';
import Spinner from 'react-spinner-material';
import { Slide, toast, ToastContainer } from 'react-toastify';

import AdvancedPdfUpload from './AdvancedPdfUpload';

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
  return (
    <>
      <OuterContainer>
        <InnerContainer>
          <h1>react-advanced-pdf-upload</h1>
          <AdvancedPdfUpload
            components={{
              loading: <Spinner />,
              uploadedPagesHeading: <h2>Uploaded pages</h2>,
              dropzonePlaceholder: <p>Drag 'n' drop some files here, or click to select files</p>,
            }}
            previewResolution={100}
            previewAreaHeight={240}
            previewAreaPadding={16}
            previewSpacing={32}
            loadPreviews={async data => {
              const res = await fetch('http://localhost:3001/render-pdf', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }).catch(e => toast.error(e.message));
              if (res) return await res.json();
            }}
          />
        </InnerContainer>
      </OuterContainer>
      <ToastContainer position="bottom-left" transition={Slide} />
    </>
  );
};
