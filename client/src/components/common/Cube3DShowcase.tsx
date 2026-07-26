import React from "react";

export const Cube3DShowcase: React.FC = () => {
  return (
    <div className="cube-container my-12 cursor-pointer">
      <div className="cube">
        <div className="face front">Classora</div>
        <div className="face back">Collab</div>
        <div className="face right">Learn</div>
        <div className="face left">Code</div>
        <div className="face top">Share</div>
        <div className="face bottom">Practice</div>
      </div>
    </div>
  );
};
