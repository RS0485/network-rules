/**
 * @fileoverview JS Script to convert the resource to the format of Quantumult X.
 *
 * @author https://github.com/RS0485
 * @version 1.0.2
 *
 * 资源解析器的使用方式: 
 *     格式: [订阅URL]?[参数列表],opt-parser=true...
 *     示例: https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/category-ads-all.yaml?src=clash&dst=quan&type=rule&subtype=domain&policy=REJECT, tag=category-ads-all, opt-parser=true, update-interval=259200
 *
 * 参数说明:
 *     src:         clash/quan/surge            转换源APP    
 *     dst:         clash/quan/surge            转换目标APP
 *     type:        server/rule/rewrite         订阅源的类型
 *     subtype      domain/ipcidr/classic       type=rule时指定规则的类型
 *     policy:      [policy name]               type=rule时指定分流策略
 * 
 * 注意事项:
 *   1. 本脚本没用自动识别功能，使用时用户必须正确地指定每一个参数
 *   2. subtype=ipcidr时，可以在policy后面加上no-resolve(用!分隔)，例如 "policy=DIRECT!no-resolve"
 */

const Runtimes = {
    Default: "default",
    QuantumultX: "quan"
}

var runtime = Runtimes.Default
if (typeof $notify != 'undefined') {
    runtime = Runtimes.QuantumultX
}

function notify(msg) {
    if (runtime === Runtimes.QuantumultX) {
        $notify(`${msg}\nresource link:${$resource.link}`)
    }
    else {
        console.log(msg)
    }
}

class RuleConverter {
    #params
    #content

    constructor(params, content) {
        this.#params = params
        this.#content = content
    }

    convert() {
        if (this.#params.src === 'clash' && this.#params.dst === 'quan') {
            return this.#clash2quan()
        }
        else {
            notify(`unsupported convertion from ${this.#params.src} to ${this.#params.dst}`)

            return {
                result: false,
                payload: []
            }
        }
    }

    #clash2quan() {
        if (this.#params.subtype != 'domain' && this.#params.subtype != 'ipcidr') {
            notify(`unsupported subtype ${this.#params.subtype} for clash2quan conversion`)

            return {
                result: false,
                payload: []
            }
        }

        const lines = this.#content.split('\n')

        var dst_lines = []
        for (const ln of lines) {
            var line = ln.trim()
            if (!line.startsWith('-')) {
                // Ignore comments or empty lines
                continue
            }

            // Support the following cases only:
            // domain:
            //   - "+.100beatscheap.com"
            //   - "store.storeimages.apple.com.akadns.net"`
            // ipcidr:
            //   - "91.108.20.0/22"   
            //   - "2001:b28:f23d::/48"
            const sections = line.split(/\"|\+\./)
            if (sections.length < 3 || sections.length > 4) {
                notify(`invalid line with content ${line}`)

                return {
                    result: false,
                    payload: []
                }
            }

            if (this.#params.subtype === 'domain') {
                if (sections.length === 3) {
                    dst_lines.push(`HOST,${sections[1]},${this.#params.policy}`)
                }
                else {
                    dst_lines.push(`HOST-SUFFIX,${sections[2]},${this.#params.policy}`)
                }
            }
            else {
                // IP-CIDR: decide if the rule is IPv4 or IPv6
                if (sections[1].match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(\/\d+)?$/)) {
                    dst_lines.push(`IP-CIDR,${sections[1]},${this.#params.policy}`)
                }
                else {
                    dst_lines.push(`IP6-CIDR,${sections[1]},${this.#params.policy}`)
                }
            }
        }

        return {
            result: true,
            payload: dst_lines
        }
    }
}

class RewriteConverter {
    #params
    #content

    constructor(params, content) {
        this.#params = params
        this.#content = content
    }
}

class ResourceParser {
    #url
    #params = {
        src: '',
        dst: '',
        type: '',
        subtype: '',
        policy: ''
    }
    #content

    constructor(url, content) {
        this.#url = url
        this.#content = content
    }

    parse_params() {
        const sections = this.#url.replace('!', ',').split('?')
        if (sections.length != 2) {
            return false
        }

        const param_list = sections[1].split('&')
        for (const param of param_list) {
            const param_sections = param.split('=')
            if (param_sections.length != 2) {
                return false
            }

            switch (param_sections[0]) {
                case 'src': this.#params.src = param_sections[1]; break
                case 'dst': this.#params.dst = param_sections[1]; break
                case 'type': this.#params.type = param_sections[1]; break
                case 'subtype': this.#params.subtype = param_sections[1]; break
                case 'policy': this.#params.policy = param_sections[1]; break
                default: continue
            }
        }

        //notify(`params parsed from url ${this.#url} is: ${JSON.stringify(this.#params)}`)
        return true
    }

    convert_content() {
        if (this.#params.type === 'rule') {
            const conv = new RuleConverter(this.#params, this.#content)
            var result = conv.convert()

            return {
                result: result.result,
                content: result.payload.join('\n')
            }
        }
        else {
            notify(`unsupported type ${this.#params.type}`)

            return {
                result: false,
                content: ''
            }
        }
    }
}

class UnitTests {

    constructor() {

    }

    #assert(condition, message) {
        if (!condition) {
            throw Error('#assert failed: ' + (message || ''))
        }
    }

    test_all() {
        this.#test_rule()
        this.#test_rewrite()
        this.#test_parser()
    }

    #test_rule() {
        this.#test_rule_clash2quan_domain()
        this.#test_rule_clash2quan_ipcidr()
        this.#test_rule_clash2quan_ipcidr_no_resolve()
    }

    #test_rewrite() {

    }

    #test_parser() {
        this.#test_resource_parser_ipcidr_no_resolve()
    }

    #test_rule_clash2quan_domain() {
        const content =
            `# Generated from https://github.com/v2fly/domain-list-community/tree/master/data/apple

# Behavior: domain

payload:
- "+.100beatscheap.com"
- "+.12diasdepresentesdeitunes.com"
- "store.apple.com.edgekey.net.globalredir.akadns.net"
- "store.storeimages.apple.com.akadns.net"`

        var params = {
            src: 'clash',
            dst: 'quan',
            type: 'rule',
            subtype: 'domain',
            policy: 'DIRECT'
        }

        const conv = new RuleConverter(params, content)
        var result = conv.convert()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.payload.length === 4)
        this.#assert(result.payload[0] === 'HOST-SUFFIX,100beatscheap.com,DIRECT')
        this.#assert(result.payload[2] === 'HOST,store.apple.com.edgekey.net.globalredir.akadns.net,DIRECT')

        return true
    }

    #test_rule_clash2quan_ipcidr() {
        const content =
            `payload:
- "91.108.56.0/22"
- "91.108.4.0/22"
- "91.108.8.0/22"
- "91.108.16.0/22"
# comment
- "91.108.12.0/22"
- "149.154.160.0/20"
- "91.105.192.0/23"
- "91.108.20.0/22"
; invalid line
- "185.76.151.0/24"
- "2001:b28:f23d::/48"
- "2001:b28:f23f::/48"
- "2001:67c:4e8::/48"
- "2001:b28:f23c::/48"
- "2a0a:f280::/32"`

        var params = {
            src: 'clash',
            dst: 'quan',
            type: 'rule',
            subtype: 'ipcidr',
            policy: 'PROXY'
        }

        const conv = new RuleConverter(params, content)
        var result = conv.convert()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.payload.length === 14)
        this.#assert(result.payload[0] === 'IP-CIDR,91.108.56.0/22,PROXY')
        this.#assert(result.payload[9] === 'IP6-CIDR,2001:b28:f23d::/48,PROXY')

        return true
    }

    #test_rule_clash2quan_ipcidr_no_resolve() {
        const content =
            `payload:
- "91.108.56.0/22"
- "91.108.4.0/22"
- "2001:b28:f23c::/48"
- "2a0a:f280::/32"`

        var params = {
            src: 'clash',
            dst: 'quan',
            type: 'rule',
            subtype: 'ipcidr',
            policy: 'PROXY,no-resolve'
        }

        const conv = new RuleConverter(params, content)
        var result = conv.convert()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.payload.length === 4)
        this.#assert(result.payload[0] === 'IP-CIDR,91.108.56.0/22,PROXY,no-resolve')
        this.#assert(result.payload[2] === 'IP6-CIDR,2001:b28:f23c::/48,PROXY,no-resolve')

        return true
    }

    #test_resource_parser_ipcidr_no_resolve() {
        const parser = new ResourceParser('https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/telegram-cidr.yaml?src=clash&dst=quan&type=rule&subtype=ipcidr&policy=PROXY!no-resolve',
            `payload:
- "91.108.56.0/22"
- "2001:b28:f23c::/48"`)

        var result = parser.parse_params()
        this.#assert(result === true)

        result = parser.convert_content()
        notify(JSON.stringify(result))
        this.#assert(result.result === true)
        this.#assert(result.content === "IP-CIDR,91.108.56.0/22,PROXY,no-resolve\nIP6-CIDR,2001:b28:f23c::/48,PROXY,no-resolve", `content: ${result.content}`)
    }
}

if (runtime === Runtimes.QuantumultX) {
    const parser = new ResourceParser($resource.link, $resource.content)

    var result = parser.parse_params()
    if (!result) {
        $done({ error: "failed to parse params from url, did you forget to specify any?" });
    }
    else {
        result = parser.convert_content()
        if (!result.result) {
            $done({ error: "failed to convert content, please check the error message." });
        }
        else {
            $done({ content: result.content });
        }
    }
}
else {
    const tests = new UnitTests()
    tests.test_all()
}
