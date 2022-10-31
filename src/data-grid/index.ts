import $ from 'licia/$'
import stripIndent from 'licia/stripIndent'
import Component, { IComponentOptions } from '../share/Component'
import each from 'licia/each'
import escape from 'licia/escape'
import types from 'licia/types'
import h from 'licia/h'
import toStr from 'licia/toStr'
import isEl from 'licia/isEl'
import isUndef from 'licia/isUndef'
import ResizeSensor from 'licia/ResizeSensor'
import throttle from 'licia/throttle'
import defaults from 'licia/defaults'
import startWith from 'licia/startWith'

/** IColumn */
export interface IColumn {
  /** Column id. */
  id: string
  /** Column display name. */
  title: string
  /** Column weight. */
  weight?: number
  /** Is column sortable. */
  sortable?: boolean
  /** Column sort comparator if sortable is true. */
  comparator?: types.AnyFn
}

/** IOptions */
export interface IOptions extends IComponentOptions {
  /** Table columns. */
  columns: IColumn[]
}

/**
 * Grid for displaying datasets.
 *
 * @example
 * const dataGrid = new DataGrid(container, {
 *   columns: [
 *     {
 *       id: 'name',
 *       title: 'Name',
 *       sortable: true,
 *     },
 *     {
 *        id: 'site',
 *        title: 'Site',
 *      },
 *   ],
 * })
 *
 * dataGrid.append({
 *   name: 'Runoob',
 *   site: 'www.runoob.com',
 * })
 */
export default class DataGrid extends Component<IOptions> {
  private $headerRow: $.$
  private $tableBody: $.$
  private $colgroup: $.$
  private resizeSensor: ResizeSensor
  private onResize: () => void
  private tableBody: HTMLElement
  private nodes: DataGridNode[] = []
  private columnWidthsInitialized = false
  private columnMap: types.PlainObj<IColumn> = {}
  constructor(container: HTMLElement, options: IOptions) {
    super(container, { compName: 'data-grid' })

    this.resizeSensor = new ResizeSensor(container)
    this.onResize = throttle(() => this.updateWeights(), 16)

    this.initOptions(options)
    const { columns } = this.options
    each(columns, (column) => {
      defaults(column, {
        sortable: false,
      })
      this.columnMap[column.id] = column
    })

    this.initTpl()
    this.$headerRow = this.find('.header').find('tr')
    this.$tableBody = this.find('.data').find('tbody')
    this.tableBody = this.$tableBody.get(0) as HTMLElement
    this.$colgroup = this.$container.find('colgroup')

    this.renderHeader()
    this.updateWeights()

    this.bindEvent()
  }
  destroy() {
    super.destroy()
    this.resizeSensor.destroy()
  }
  /** Append row data. */
  append(data: types.PlainObj<string | HTMLElement>) {
    const node = new DataGridNode(this, data)
    this.tableBody.appendChild(node.container)
    this.nodes.push(node)
  }
  private bindEvent() {
    const { c, $headerRow } = this

    this.resizeSensor.addListener(this.onResize)

    const self = this
    $headerRow.on(
      'click',
      c('.sortable'),
      function (this: HTMLTableCellElement) {
        const $this = $(this)
        const id = $this.data('id')
        const order = $this.data('order')
        const isAscending = order !== 'descending'
        $this.data('order', isAscending ? 'descending' : 'ascending')

        self.sortNodes(id, isAscending)

        $headerRow.find('th').each(function (this: HTMLTableCellElement) {
          const $this = $(this)
          if ($this.data('id') !== id) {
            $this.rmAttr('data-order')
          }
        })
      }
    )
  }
  private sortNodes(id: string, isAscending: boolean) {
    const column = this.columnMap[id]

    const comparator = column.comparator || naturalOrderComparator
    this.nodes.sort(function (a, b) {
      const aVal = a.data[id]
      const bVal = b.data[id]

      return isAscending ? comparator(aVal, bVal) : comparator(bVal, aVal)
    })

    this.renderData()
  }
  private updateWeights() {
    const { container, $headerRow } = this
    const { columns } = this.options

    const tableWidth = container.offsetWidth
    if (!this.columnWidthsInitialized && tableWidth) {
      for (let i = 0, len = columns.length; i < len; i++) {
        const column = columns[i]
        if (!column.weight) {
          const thWidth = ($headerRow.find('th').get(i) as HTMLElement)
            .offsetWidth
          column.weight = (100 * thWidth) / tableWidth
        }
      }

      this.columnWidthsInitialized = true
    }

    this.applyColumnWeights()
  }
  private applyColumnWeights() {
    const { container, $colgroup } = this
    const { columns } = this.options

    const tableWidth = container.offsetWidth
    if (tableWidth <= 0) {
      return
    }

    let sumOfWeights = 0
    const len = columns.length
    for (let i = 0; i < len; i++) {
      sumOfWeights += columns[i].weight as number
    }

    const minColumnWidth = 14
    let html = ''

    let sum = 0
    let lastOffset = 0
    for (let i = 0; i < len; i++) {
      const column = columns[i]
      sum += column.weight as number
      const offset = ((sum * tableWidth) / sumOfWeights) | 0
      const width = Math.max(offset - lastOffset, minColumnWidth)
      lastOffset = offset
      html += `<col style="width:${width}px"></col>`
    }

    $colgroup.html(html)
  }
  private renderData() {
    const { $tableBody, tableBody, nodes } = this

    $tableBody.html('')
    each(nodes, (node) => {
      tableBody.appendChild(node.container)
    })
  }
  private renderHeader() {
    const { c } = this
    let html = ''
    each(this.options.columns, (column) => {
      const title = escape(column.title)
      if (column.sortable) {
        html += c(`<th class="sortable" data-id="${column.id}">${title}</th>`)
      } else {
        html += `<th>${title}</th>`
      }
    })

    this.$headerRow.html(html)
  }
  private initTpl() {
    this.$container.html(
      this.c(stripIndent`
        <div class="header-container">
          <table class="header">
            <colgroup></colgroup>
            <tbody>
              <tr></tr>
            </tbody>
          </table>
        </div>
        <div class="data-container">
          <table class="data">
            <colgroup></colgroup>
            <tbody></tbody>
          </table>
        </div>
      `)
    )
  }
}

class DataGridNode {
  container: HTMLElement = h('tr')
  data: types.PlainObj<string | HTMLElement>
  private $container: $.$
  private dataGrid: DataGrid
  constructor(dataGrid: DataGrid, data: types.PlainObj<string | HTMLElement>) {
    this.$container = $(this.container)

    this.dataGrid = dataGrid
    this.data = data

    this.render()
  }
  render() {
    const { data, $container, container } = this
    const columns = this.dataGrid.getOption('columns') as IColumn[]

    $container.html('')
    each(columns, (column) => {
      const td = h('td')
      const val = data[column.id]
      if (!isUndef(val)) {
        if (isEl(val)) {
          td.appendChild(val as HTMLElement)
        } else {
          td.innerText = toStr(val)
        }
      }
      container.appendChild(td)
    })
  }
}

function naturalOrderComparator(a: any, b: any) {
  a = toStr(a)
  b = toStr(b)
  if (startWith(a, '_') && !startWith(b, '_')) {
    return 1
  }
  if (startWith(b, '_') && !startWith(a, '_')) {
    return -1
  }

  const chunk = /^\d+|^\D+/
  let chunka, chunkb, anum, bnum
  /* eslint-disable no-constant-condition */
  while (true) {
    if (a) {
      if (!b) {
        return 1
      }
    } else {
      if (b) {
        return -1
      }
      return 0
    }
    chunka = a.match(chunk)[0]
    chunkb = b.match(chunk)[0]
    anum = !isNaN(chunka)
    bnum = !isNaN(chunkb)
    if (anum && !bnum) {
      return -1
    }
    if (bnum && !anum) {
      return 1
    }
    if (anum && bnum) {
      const diff = chunka - chunkb
      if (diff) {
        return diff
      }
      if (chunka.length !== chunkb.length) {
        if (!+chunka && !+chunkb) {
          return chunka.length - chunkb.length
        }
        return chunkb.length - chunka.length
      }
    } else if (chunka !== chunkb) {
      return chunka < chunkb ? -1 : 1
    }
    a = a.substring(chunka.length)
    b = b.substring(chunkb.length)
  }
}

module.exports = DataGrid
module.exports.default = DataGrid
