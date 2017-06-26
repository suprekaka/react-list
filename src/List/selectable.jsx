import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import last from 'lodash/last'
import range from 'lodash/range'
import isFunction from 'lodash/isFunction'
import classnames from 'classnames'

/**
 * Default checkbox component
 */
const DefaultCheckbox = ({
  checked,
  onChange,
}) => (
  <div className="ow-selectable-defaultCheckbox-wrapper">
    <input
      type="checkbox"
      checked={checked}
      onClick={onChange}
    />
  </div>
)

DefaultCheckbox.defaultProps = {
  checked: false,
  onChange: () => {},
}

DefaultCheckbox.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
}

/**
 * HOC, extend selectable and checkable features to list-like component
 * @param {Element} WrappedComponent - Origin component
 * @param {Element} CheckboxComponent - Checkbox component
 *
 * Term:
 *  1. itemData - Received render data from user.
 *  2. itemIndexInfo - A object used to store many index info.
 */
const selectable = (
  WrappedComponent,
  {
    CheckboxComponent = DefaultCheckbox,
    enableMultiSelect = true,
    enableCheckable = enableMultiSelect,
  } = {},
) => {
  class SelectComponent extends PureComponent {
    constructor(props) {
      super(props)
      const {
        enableSection,
        data,
      } = props

      if (enableSection) {
        this.itemIndexData = this.getRowIndexData(data)
      }

      this.state = {
        ...this.getDefaultSelectedState(props),
      }
    }

    componentWillReceiveProps(nextProps) {
      const {
        defaultSelectedStatus,
        data,
        itemTotalCount,
        enableSection,
      } = this.props
      if (defaultSelectedStatus !== nextProps.defaultSelectedStatus) {
        this.setState({
          ...this.getDefaultSelectedState(nextProps),
        })
      }
      if (
        data.length !== nextProps.data.length ||
        itemTotalCount !== nextProps.itemTotalCount ||
        enableSection !== nextProps.enableSection
      ) {
        this.getRowIndexData(nextProps.data)
      }
    }

    getRowIndexData(data) {
      let index = 0
      const indexData = []
      data.forEach((section, sectionIndex) => {
        indexData.push({
          globalIndex: index,
          sectionIndex,
          isSection: true,
        })
        index += 1

        for (let i = 0; i < section.itemTotalCount; i += 1) {
          indexData.push({
            globalIndex: index,
            sectionIndex,
            itemIndex: i,
          })
          index += 1
        }
      })
      return indexData
    }

    getDefaultSelectedState({
      data,
      enableSection,
      defaultSelectedStatus,
      itemTotalCount,
    }) {
      const state = {
        highlightedItems: [],
        checkedItems: [],
      }
      this.selectedItems = []

      if (!isFunction(defaultSelectedStatus)) {
        throw new Error('The "defaultSelectedStatus" prop must be function')
      }
      // data.forEach((...args) => {
      if (enableSection) {
        this.itemIndexData.forEach((indexInfo) => {
          if (!indexInfo.isSection) {
            const itemData = data[indexInfo.sectionIndex].items[indexInfo.itemIndex]
            if (defaultSelectedStatus(itemData, indexInfo)) {
              const item = this.parseItemData(indexInfo)
              if (enableCheckable) {
                state.checkedItems.push(item)
              }
              state.highlightedItems.push(item)
              this.selectedItems.push(item)
            }
          }
        })
      } else {
        for (let i = 0; i < (itemTotalCount || data.length); i += 1) {
          const v = data[i]
        // data.forEach((v, i) => {
          if (defaultSelectedStatus(v, i)) {
            const item = this.parseItemData({ index: i })
            if (enableCheckable) {
              state.checkedItems.push(item)
            }
            state.highlightedItems.push(item)
            this.selectedItems.push(item)
          }
        }
      }
      return state
    }

    getMultiSelectIndexes(
      item,
      {
        ctrlKey,
        shiftKey,
        metaKey,
      },
      isCheckMode,
    ) {
      const compatibleCtrlKey = ctrlKey || metaKey
      const {
        highlightedItems,
        checkedItems,
      } = this.state
      const selectedStore = isCheckMode ? checkedItems : highlightedItems
      if ((compatibleCtrlKey && !shiftKey) || (isCheckMode && !shiftKey)) {
        /* if selectedStore includes the index then remove it */
        if (this.isArrayIncludesObject(selectedStore, item)) {
          // return selectedStore.filter(v => v !== index)
          return selectedStore.filter(v => !this.isItemEqual(v, item))
        }
        /* if selectedStore doesn't includes the index then append it */
        return [
          ...selectedStore,
          item,
        ]
      } else if (shiftKey && !compatibleCtrlKey) {
        const lastSelected = last(selectedStore)
        // if (lastSelected || lastSelected === 0) {
        if (lastSelected) {
          if (lastSelected < item) {
            // return [
            //   ...range(lastSelected + 1, item + 1),
            //   lastSelected,
            // ]
            return [
              ...this.getItemRangeByGlobalIndex(lastSelected + 1, item + 1),
              lastSelected,
            ]
          }
          // return range(item + 0, lastSelected + 1)
          return this.getItemRangeByGlobalIndex(item + 0, lastSelected + 1)
        }
        // return range(item + 1)
        return this.getItemRangeByGlobalIndex(item + 1)
      }
      return [item]
    }

    getSelectedData(receivedData, keys, isCheckMode) {
      const item = this.parseItemData(receivedData)

      /* Multiple select enabled */
      if (enableMultiSelect) {
        return this.getMultiSelectIndexes(item, keys, isCheckMode)
      }

      /* Multiple select disabled */
      return [item]
    }

    /**
     * Get item data by globalIndex
     * Include startIndex but not endIndex
     * @param {*} startIndex
     * @param {*} endIndex
     */
    getItemRangeByGlobalIndex(startIndex, endIndex) {
      const {
        enableSection,
      } = this.props
      const indexes = range(startIndex, endIndex)
      if (enableSection) {
        // debugger
        return indexes
          .map(index => this.parseItemData(this.itemIndexData[index]))
          .filter(data => !data.isSection)
      }
      return indexes.map(v => this.parseItemData({ index: v }))
    }

    isItemEqual(item1, item2) {
      const {
        enableSection,
      } = this.props
      if (enableSection) {
        return item1.globalIndex === item2.globalIndex
      }
      return item1.index === item2.index
    }

    isArrayIncludesObject(array, obj) {
      // return array.some(v => isEqual(v, obj))
      return array.some(v => this.isItemEqual(v, obj))
    }

    parseItemData(receivedData) {
      const {
        enableSection,
      } = this.props
      let item = null

      if (enableSection) {
        const {
          globalIndex,
          itemIndex,
          sectionIndex,
        } = receivedData
        item = {
          globalIndex,
          itemIndex,
          sectionIndex,
        }
        Object.defineProperty(item, 'valueOf', {
          value: function valueOf() {
            return this.globalIndex
          },
        })
      } else {
        const { index } = receivedData
        item = {
          index,
        }
        Object.defineProperty(item, 'valueOf', {
          value: function valueOf() {
            return this.index
          },
        })
      }
      return item
    }

    emitSelectedChange() {
      const {
        onSelectedChange,
        enableSection,
      } = this.props
      let result = []
      if (enableSection) {
        result = this.selectedItems.slice().sort((x, y) => x.globalIndex - y.globalIndex)
      } else {
        result = this.selectedItems.map(v => v.index).sort((x, y) => x - y)
      }
      onSelectedChange(result)
    }

    handleItemClick(receivedData, e) {
      const selected = this.getSelectedData(
        receivedData,
        {
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
        },
        false,
      )
      const compatibleCtrlKey = e.ctrlKey || e.metaKey
      if (selected.length === 1 && !compatibleCtrlKey) {
        this.setState({
          highlightedItems: selected,
          checkedItems: [],
        })
      } else {
        this.setState({
          highlightedItems: selected,
          checkedItems: selected,
        })
      }
      this.selectedItems = selected
      this.emitSelectedChange()
    }

    handleCheckChange(receivedData, e) {
      const selected = this.getSelectedData(
        receivedData,
        {
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
        },
        true,
      )
      this.setState({
        highlightedItems: selected,
        checkedItems: selected,
      })
      this.selectedItems = selected
      this.emitSelectedChange()
    }

    buildRenderItem() {
      const {
        renderItem,
      } = this.props
      return (...args) => {
        const [item] = args
        const {
          highlightedItems,
          checkedItems,
        } = this.state
        const Item = renderItem(...args)
        if (!Item) {
          return null
        }
        // const isHighlighted = highlightedItems.includes(item)
        const isHighlighted = this.isArrayIncludesObject(highlightedItems, item)

        const wrapperClassName = classnames('ow-selectable-wrapper', {
          'ow-selectable-selected': isHighlighted,
        })
        if (enableCheckable) {
          const isChecked = this.isArrayIncludesObject(checkedItems, item)
          return (
            <div
              className={wrapperClassName}
              onClick={(e) => {
                if (!e.currentTarget.querySelector('.ow-selectable-checkbox-container').contains(e.target)) {
                  this.handleItemClick(item, e)
                }
              }}
            >
              <div className="ow-selectable-checkbox-container">
                <CheckboxComponent
                  checked={isChecked}
                  onChange={(e) => {
                    this.handleCheckChange(item, e)
                  }}
                />
              </div>
              <div className="ow-selectable-item-wrapper">
                {Item}
              </div>
            </div>
          )
        }

        return (
          <div
            className={wrapperClassName}
            onClick={(e) => {
              this.handleItemClick(item, e)
            }}
          >
            <div className="ow-selectable-item-wrapper">
              {Item}
            </div>
          </div>
        )
      }
    }

    render() {
      const {
        renderItem,
        defaultSelectedStatus,
        onSelectedChange,
        ...passThroughProps
      } = this.props
      return (
        <WrappedComponent
          {...passThroughProps}
          renderItem={this.buildRenderItem()}
        />
      )
    }
  }

  SelectComponent.defaultProps = {
    data: [],
    defaultSelectedStatus: () => false,
    onSelectedChange: () => {},
    enableSection: false,
    itemTotalCount: undefined,
  }

  SelectComponent.propTypes = {
    data: PropTypes.oneOfType([
      /* It's used to when section feature is disabled */
      PropTypes.arrayOf(
        PropTypes.object,
      ),

      /* It's used to when section feature is enabled */
      PropTypes.arrayOf(PropTypes.shape({
        data: PropTypes.object,
        items: PropTypes.arrayOf(PropTypes.object).isRequired,
        itemTotalCount: PropTypes.number,
      })),
    ]).isRequired,
    itemTotalCount: PropTypes.number,
    renderItem: PropTypes.func.isRequired,
    defaultSelectedStatus: PropTypes.func,
    onSelectedChange: PropTypes.func,
    enableSection: PropTypes.bool,
  }

  return SelectComponent
}

export default selectable
