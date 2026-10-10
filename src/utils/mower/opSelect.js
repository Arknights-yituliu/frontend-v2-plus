import { NAvatar, NTag } from "naive-ui";
import { h } from "vue";
import OperatorSkillTooltip from "@/pages/tools/mower-plan/components/OperatorSkillTooltip.vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { nameToCharId, charIdToName } from "./operatorAssets.js";

const getInitial = (label) => (label ? label.slice(0, 1) : "");

const getDisplayName = (option) => {
  if (option?.label) return option.label;
  if (option?.value && charIdToName[option.value]) return charIdToName[option.value];
  return option?.value ?? "";
};

const getCharId = (option) => {
  if (option?.label && nameToCharId[option.label]) return nameToCharId[option.label];
  if (option?.value && charIdToName[option.value]) return option.value;
  return option?.value;
};

const renderAvatar = (option, size = 26) => {
  const charId = getCharId(option);
  if (charId && charIdToName[charId]) {
    return h(OperatorAvatar, {
      charId,
      size,
      mobileSize: size,
      border: true,
    });
  }
  const label = getDisplayName(option);
  return h(
    NAvatar,
    {
      round: false,
      size,
      style: { borderRadius: "2px", flexShrink: 0 },
    },
    () => (option?.value === "" ? "" : getInitial(label))
  );
};

export const renderOperatorTag = ({ option, handleClose }) => {
  return h(
    NTag,
    {
      style: {
        padding: "0 6px 0 4px",
        height: "28px",
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
      },
      round: true,
      closable: true,
      onClose: (e) => {
        e.stopPropagation();
        handleClose();
      },
    },
    {
      default: () =>
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              lineHeight: "1",
            },
          },
          [
            h(
              "div",
              {
                style: {
                  marginRight: "4px",
                  display: "flex",
                },
              },
              renderAvatar(option, 22)
            ),
            getDisplayName(option),
          ]
        ),
    }
  );
};

export const renderOperatorLabel = (option) => {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
    },
    [
      h(
        "div",
        {
          style: {
            display: "flex",
          },
        },
        renderAvatar(option, 26)
      ),
      getDisplayName(option),
    ]
  );
};

// Only dropdown rows receive skill hints; selected fields and tags keep their normal rendering.
export const renderOperatorOption = ({ option, node }) =>
  h(OperatorSkillTooltip, { charId: getCharId(option), name: getDisplayName(option) }, { default: () => node });
