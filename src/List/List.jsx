import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import isNumber from 'lodash/isNumber'
import clamp from 'lodash/clamp'
import isFunction from 'lodash/isFunction'
import classnames from 'classnames'

/**
 * @class List
 *
 * This is a high performance list component and supports section feature.
 *
 * Concept:
 *   Visible Area: The visible area in the list,
 *     it's height equals listHeight.
 *   Render Area: The area where to render items,
 *     it's height equals visible height plus buffer height (maybe both of top and bottom buffer area)
 *   Buffer Count: The maximum count of buffer items to be rendered at top or bottom of Visible Area
 *
 * Intro:
 *   This component is suitable for huge number of items, especially the total count of items is known.
 *   The height of scroll bar will reflect the total count of items.
 *   In order to ensure high performance, no matter how much items, it will eventually render
 *     the items which in the visible area and the buffer settings.
 *   Thanks to React ensures that the minimum number of DOM operations are guaranteed
 *     during scrolling.
 *
 * Usage:
 *   Without section feature:
 *     Feed "data" prop as an array of item data object.
 *     Implement "renderItem" method to responsible for rendering a item row.
 *     Feed "itemHeight" as either a fixed item height (number) or a function that returns the dynamic height of a item.
 *
 *   With section feature:
 *     Feed "enableSection" prop as true, and then feed "data" prop as an array of section data object.
 *     Implement "renderItem" method to responsible for rendering a item row.
 *     Implement "renderSectionHeader" method to responsible for rendering a section header row.
 *     Feed "itemHeight" as either a fixed item height (number) or a function that returns the dynamic height of a item.
 *     Feed "sectionHeaderHeight" as a fixed section header height.
 *
 * @extends {PureComponent} It uses shallow compare as a performance optimization.
 */
class List extends PureComponent {
  constructor(props) {
    super(props)
    this.cache = {}

    this.state = {
      renderData: this.getRenderData(props),
    }
    let currentScrollTop = 0
    const {
      enableSection,
      defaultShownSectionIndex,
    } = props
    if (enableSection && isNumber(defaultShownSectionIndex)) {
      currentScrollTop = this.getSectionHeaderTop(defaultShownSectionIndex)
    }
    this.state = {
      ...this.state,
      currentScrollTop,
    }

    this.handleScroll = this.handleScroll.bind(this)
  }

  componentDidMount() {
    this.listScrollTo(this.state.currentScrollTop)
  }

  componentWillReceiveProps(nextProps) {
    const {
      data,
      itemTotalCount,
      itemHeight,
      enableSection,
      sectionHeaderHeight,
      defaultShownSectionIndex,
    } = this.props

    if (
      nextProps.data.length !== data.length ||
      nextProps.data !== data ||
      nextProps.itemHeight !== itemHeight ||
      nextProps.itemTotalCount !== itemTotalCount ||
      nextProps.enableSection !== enableSection ||
      nextProps.sectionHeaderHeight !== sectionHeaderHeight
    ) {
      this.setState({
        renderData: this.getRenderData(nextProps),
      })
    }

    if (enableSection && defaultShownSectionIndex !== nextProps.defaultShownSectionIndex) {
      this.setState({
        currentScrollTop: this.getSectionHeaderTop(nextProps.defaultShownSectionIndex),
      })
    }
  }

  componentDidUpdate() {
    const {
      onScroll,
      enableSection,
    } = this.props
    const {
      currentScrollTop,
      renderData,
    } = this.state
    const {
      renderStartIndex,
      renderEndIndex,
    } = this.cache

    if (this.scrollContainer) {
      this.listScrollTo(currentScrollTop)
    }

    if (renderStartIndex !== renderEndIndex) {
      // console.log('expect', renderStartIndex, renderEndIndex)
      let expectStartIndex = null
      let expectEndIndex = null
      if (enableSection) {
        const startRow = renderData.rows[renderStartIndex]
        const endRow = renderData.rows[renderEndIndex]
        expectStartIndex = {
          globalIndex: startRow.globalIndex,
          sectionIndex: startRow.sectionIndex,
        }
        if (!startRow.isSection) {
          expectStartIndex.itemIndex = startRow.itemIndex
        }
        expectEndIndex = {
          globalIndex: endRow.globalIndex,
          sectionIndex: endRow.sectionIndex,
        }
        if (!endRow.isSection) {
          expectEndIndex.itemIndex = endRow.itemIndex
        }
      } else {
        expectStartIndex = renderStartIndex
        expectEndIndex = renderEndIndex
      }
      // console.info('expect', expectStartIndex, expectEndIndex)

      onScroll(currentScrollTop, {
        expectStartIndex,
        expectEndIndex,
      })
    }
    // console.info('component did update')
  }

  getRowTotalCount() {
    const {
      enableSection,
    } = this.props
    const {
      renderData,
    } = this.state
    if (enableSection) {
      return renderData.rowTotalCount
    }
    return renderData.itemTotalCount
  }

  getItemHeight(itemHeight, ...args) {
    let height = 0
    if (isNumber(itemHeight)) {
      if (Number.isNaN(itemHeight)) {
        throw new Error('Please ensure that "itemHeight" prop of List component can not be NaN')
      }
      height = itemHeight
    } else if (isFunction(itemHeight)) {
      height = itemHeight(...args)
      if (!isNumber(height) || Number.isNaN(height)) {
        throw new Error('When "itemHeight" prop is a function, please ensure that the return value must be a number and not NaN')
      }
    } else {
      throw new Error('Please ensure that "itemHeight" prop of List component must be Number or Function')
    }
    return height
  }

  getSectionHeaderHeight(sectionHeaderHeight, ...args) {
    let height = 0
    if (isNumber(sectionHeaderHeight)) {
      if (Number.isNaN(sectionHeaderHeight)) {
        throw new Error('Please ensure that "sectionHeaderHeight" prop of List component can not be NaN')
      }
      height = sectionHeaderHeight
    } else if (isFunction(sectionHeaderHeight)) {
      height = sectionHeaderHeight(...args)
      if (!isNumber(height) || Number.isNaN(height)) {
        throw new Error('When "sectionHeaderHeight" prop is a function, please ensure that the return value must be a number and not NaN')
      }
    } else {
      throw new Error('Please ensure that "sectionHeaderHeight" prop of List component must be Number or Function')
    }
    return height
  }

  getSectionHeaderTop(sectionIndex) {
    const {
      sections,
      sectionTotalCount,
    } = this.state.renderData
    const index = clamp(sectionIndex, 0, sectionTotalCount - 1)
    return sections[index].clientRect.top
  }

  getRenderData({
    data,
    itemTotalCount,
    itemHeight,
    enableSection,
    sectionHeaderHeight,
  }) {
    let renderData = null
    if (enableSection) {
      renderData = {
        rows: [],
        sections: [],
        totalHeight: 0,
        sectionTotalCount: data.length,
        itemTotalCount: 0,
        rowTotalCount: 0,
      }
      let index = 0
      const rows = renderData.rows

      data.forEach((section, sectionIndex) => {
        const headerHeight = this.getSectionHeaderHeight(sectionHeaderHeight, section, sectionIndex)
        const headerTop = index === 0 ? 0 : rows[index - 1].clientRect.bottom
        const headerBottom = headerTop + headerHeight

        const renderSectionData = {
          isSection: true,
          globalIndex: index,
          sectionIndex,
          data: section.data,
          clientRect: {
            top: headerTop,
            bottom: headerBottom,
            height: headerHeight,
          },
        }
        rows.push(renderSectionData)
        renderData.sections.push(renderSectionData)
        renderData.itemTotalCount += section.itemTotalCount
        index += 1

        for (let i = 0; i < section.itemTotalCount; i += 1) {
          const itemData = section.items[i]
          const height = this.getItemHeight(
            itemHeight,
            section.data,
            itemData,
            {
              sectionIndex,
              itemIndex: i,
            },
          )
          const top = rows[index - 1].clientRect.bottom
          const bottom = top + height
          rows.push({
            sectionIndex,
            itemIndex: i,
            globalIndex: index,
            section: section.data,
            data: itemData,
            clientRect: {
              top,
              bottom,
              height,
            },
          })
          if (i === section.itemTotalCount - 1 && sectionIndex === renderData.sectionTotalCount - 1) {
            renderData.totalHeight = bottom
          }

          index += 1
        }
      })
      renderData.rowTotalCount = renderData.itemTotalCount + renderData.sectionTotalCount
      // console.log('init data', renderData)
      // debugger
    } else {
      renderData = {
        rows: [],
        totalHeight: 0,
        itemTotalCount: itemTotalCount || data.length,
      }
      const rows = renderData.rows

      for (let i = 0; i < renderData.itemTotalCount; i += 1) {
        const v = data[i]
        const height = this.getItemHeight(itemHeight, v, i)
        const top = i === 0 ? 0 : rows[i - 1].clientRect.bottom
        const bottom = top + height
        rows.push({
          index: i,
          data: v,
          clientRect: {
            top,
            bottom,
            height,
          },
        })
        if (i === renderData.itemTotalCount - 1) {
          renderData.totalHeight = bottom
        }
      }
    }
    return renderData
  }

  calcRenderItemRange() {
    const {
      bufferCount,
      listHeight,
    } = this.props
    const {
      currentScrollTop,
      renderData,
    } = this.state

    const rowTotalCount = this.getRowTotalCount()

    const visibleAreaHeight = listHeight
    const visibleAreaTop = currentScrollTop
    const visibleAreaBottom = visibleAreaTop + visibleAreaHeight

    const listTotalHeight = renderData.totalHeight

    let renderStartIndex = -1
    let renderEndIndex = -1

    if (listTotalHeight <= visibleAreaHeight) {
      renderEndIndex = Math.max(rowTotalCount - 1, 0)
    }

    for (let i = 0; i < rowTotalCount; i += 1) {
      const itemRect = renderData.rows[i].clientRect
      if (itemRect.top <= visibleAreaTop && itemRect.bottom > visibleAreaTop) {
        renderStartIndex = i
      }
      if (itemRect.top < visibleAreaBottom && itemRect.bottom >= visibleAreaBottom) {
        renderEndIndex = i
      }

      if (renderStartIndex !== -1 && renderEndIndex !== -1) {
        break
      }
    }
    renderStartIndex = Math.max(renderStartIndex - bufferCount, 0)
    // renderEndIndex = Math.max(Math.min(renderEndIndex + bufferCount, rowTotalCount - 1), 0)
    renderEndIndex = clamp(renderEndIndex + bufferCount, 0, rowTotalCount - 1)

    this.cache = {
      ...this.cache,
      renderStartIndex,
      renderEndIndex,
    }

    return {
      listTotalHeight,
      renderStartIndex,
      renderEndIndex,
    }
  }

  listScrollTo(top) {
    if (this.scrollContainer && this.scrollContainer.scrollTop !== top) {
      this.scrollContainer.scrollTop = top
    }
  }

  handleScroll() {
    this.setState({
      currentScrollTop: this.scrollContainer.scrollTop,
    })
  }

  renderItems(itemsData) {
    const {
      renderItem,
    } = this.props
    return itemsData.map(
      (
        {
          index,
          data,
          clientRect: {
            top,
            height,
          },
        },
      ) => {
        const Item = renderItem({
          item: data,
          index,
        })
        return (
          <div
            key={`iw_${index}`}
            className="ow-list-item-wrapper"
            style={{
              height,
              top,
            }}
            role="presentation"
          >
            {Item}
          </div>
        )
      },
    )
  }

  renderItemsWithSection(rowsData) {
    const {
      renderItem,
      renderSectionHeader,
    } = this.props
    return rowsData.map(
      (
        {
          globalIndex,
          isSection,
          itemIndex,
          sectionIndex,
          data,
          clientRect: {
            top,
            height,
          },
        },
      ) => {
        let Item = null
        if (isSection) {
          Item = renderSectionHeader({
            section: data,
            sectionIndex,
            globalIndex,
          })
        } else {
          Item = renderItem({
            item: data,
            globalIndex,
            itemIndex,
            sectionIndex,
          })
        }
        return (
          <div
            key={`iw_${globalIndex}`}
            className="ow-list-item-wrapper"
            style={{
              height,
              top,
            }}
            role="presentation"
          >
            {Item}
          </div>
        )
      },
    )
  }

  renderRows(startIndex, endIndex) {
    const {
      enableSection,
    } = this.props
    const {
      renderData,
    } = this.state

    const data = renderData.rows.slice(startIndex, endIndex + 1)
    if (enableSection) {
      return this.renderItemsWithSection(data)
    }
    return this.renderItems(data)
  }

  render() {
    const {
      className,
      listHeight,
    } = this.props

    if (listHeight === 0) {
      return null
    }

    /**
     * NOTE:
     * calcRenderItemRange function has to be called in render function!
     * Because the setState() is async, it's possible to call setState() multiple times
     *   but only triggers render() call once
     */
    const {
      renderStartIndex,
      renderEndIndex,
      listTotalHeight,
    } = this.calcRenderItemRange()

    // console.info('render', renderStartIndex, renderEndIndex)

    return (
      <div
        className={classnames('ow-list', className)}
      >
        <div
          className="ow-list-container"
          style={{ height: listHeight }}
          ref={(node) => {
            this.scrollContainer = node
          }}
          onScroll={this.handleScroll}
        >
          <div
            className="ow-list-wrapper"
            style={{
              height: listTotalHeight,
            }}
          >
            {this.renderRows(renderStartIndex, renderEndIndex)}
          </div>
        </div>
      </div>
    )
  }
}

List.defaultProps = {
  className: '',
  listHeight: 'auto',
  bufferCount: 0,
  onScroll: () => {},
  itemTotalCount: undefined,

  enableSection: false,
  renderSectionHeader: undefined,
  sectionHeaderHeight: undefined,

  defaultShownSectionIndex: 0,
}

List.propTypes = {
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

  /** Responsible for rendering a item row */
  renderItem: PropTypes.func.isRequired,

  /**
   * Either a fixed item height (number) or a function that returns the height of a item
   */
  itemHeight: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.func,
  ]).isRequired,

  /** Height constraint for list */
  listHeight: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),

  className: PropTypes.string,
  /** The maximum count of buffer item to be rendered at top and bottom of Visible Area */
  bufferCount: PropTypes.number,
  onScroll: PropTypes.func,

  /** The total number of items, it's only used to without section feature */
  itemTotalCount: PropTypes.number,

  /** Enable/Disable section feature, default is false */
  enableSection: PropTypes.bool,

  /** Only used to with section feature, responsible for render a section header row */
  renderSectionHeader: PropTypes.func,

  /** Only used to with section feature, a fixed number of height */
  sectionHeaderHeight: PropTypes.number,

  /** Only used to with section feature, used to scroll to section */
  defaultShownSectionIndex: PropTypes.number,
}

export default List
