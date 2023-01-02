/**
 * @fileoverview JS Script to convert the resource to the format of Quantumult X.
 *
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules/tree/main/resource
 * @version 1.0.5
 *
 * 资源解析器的使用方式:
 *     格式: [订阅URL]?[参数列表],opt-parser=true...
 *     示例: https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/category-ads-all.yaml?src=clash&dst=quan&type=rule&subtype=domain&policy=REJECT, tag=category-ads-all, opt-parser=true, update-interval=259200
 *
 * 参数说明:
 *     src:         clash/quan                    源格式, any表示任意
 *     dst:         clash/quan                    目标格式, any表示任意
 *     type:        server/rule/rewrite/generate  订阅源的类型
 *     subtype      domain/ipcidr/ipasn/mixed     type=rule时指定规则的类型
 *     policy:      [policy name]                 type=rule时指定分流策略
 *
 * 注意事项:
 *   1. 本脚本没用自动识别功能，使用时用户必须正确地指定每一个参数
 *   2. subtype=为IP相关的规则时，可以在policy后面加上no-resolve(用!分隔)，例如 "policy=DIRECT!no-resolve"
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
        $notify('Resource parsing failed', `${$resource.link}`, `${msg}`)
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
        if (this.#params.subtype === 'ipasn') {
            return this.#ipasn2quan()
        }
        else if (this.#params.src === 'clash' && this.#params.dst === 'quan') {
            return this.#clash2quan()
        }
        else {
            notify(`unsupported convertion from ${this.#params.src} to ${this.#params.dst} with subtype=${this.#params.subtype}`)

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

    #ipasn2quan() {
        const lines = this.#content.split('\n')

        var dst_lines = []

        // Surrport the following cases:
        // 标准list:                            IP-ASN,7497 // 计算机网络信息中心
        // 逗号分隔符前后有一个或多个空格:      IP-ASN , 7586 // Cloudfort IT
        // Stash的override风格:                 - IP-ASN,4134,DIRECT,no-resolve // 金融街31号
        const regexp = /IP-ASN(\s+)?,(\s+)?(\d+)/
        for (const ln of lines) {
            var line = ln.trim()
            if (line.startsWith('#') || line.startsWith('//')) {
                continue
            }

            const match = line.match(regexp);
            if (!match || match.length < 1) {
                continue
            }

            dst_lines.push(`IP-ASN,${match[match.length - 1]},${this.#params.policy}`)
        }

        if (dst_lines.length < 1) {
            notify(`no ipasn lines found within the content`)

            return {
                result: false,
                payload: []
            }
        }
        else {
            return {
                result: true,
                payload: dst_lines
            }
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

class ContentGenerator {
    #params

    constructor(params) {
        this.#params = params
    }

    base64_decode(encoded_string) {
        // https://www.rfc-editor.org/rfc/rfc4648#section-4
        var decoded_string = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      
        for (var i = 0; i < encoded_string.length; i += 4) {
          const a = chars.indexOf(encoded_string[i]);
          const b = chars.indexOf(encoded_string[i + 1]);
          const c = chars.indexOf(encoded_string[i + 2]);
          const d = chars.indexOf(encoded_string[i + 3]);
      
          decoded_string += String.fromCharCode((a << 2) | (b >> 4));
          if (encoded_string[i + 2] !== '=') {
            decoded_string += String.fromCharCode(((b & 15) << 4) | (c >> 2));
          }
          if (encoded_string[i + 3] !== '=') {
            decoded_string += String.fromCharCode(((c & 3) << 6) | d);
          }
        }
      
        return decoded_string;
    }

    generate() {
        // Input
        const lines = this.base64_decode(this.#params.content).split('\n')

        var dst_lines = []

        for (const ln of lines) {
            const line = ln.trim()
            if (line != '') {
                dst_lines.push(line)
            }
        }

        if (dst_lines.length < 1) {
            notify(`no valid lines found within the content parameter`)

            return {
                result: false,
                payload: []
            }
        }
        else {
            return {
                result: true,
                payload: dst_lines
            }
        }
    }
}

class ResourceParser {
    #url
    #params = {
        src: '',
        dst: '',
        type: '',
        subtype: '',
        policy: '',
        content: ''
    }
    #content

    constructor(url, content) {
        this.#url = url
        this.#content = content
    }

    parse_params() {
        const sections = this.#url.replaceAll('!', ',').split('?')
        if (sections.length != 2) {
            return false
        }

        const param_list = sections[1].split('&')
        for (const param of param_list) {
            const splitter_index = param.indexOf('=')
            if (splitter_index === -1) {
                return false
            }

            var param_sections = []
            param_sections.push(param.substring(0, splitter_index))
            param_sections.push(param.substring(splitter_index+1))

            switch (param_sections[0]) {
                case 'src': this.#params.src = param_sections[1]; break
                case 'dst': this.#params.dst = param_sections[1]; break
                case 'type': this.#params.type = param_sections[1]; break
                case 'subtype': this.#params.subtype = param_sections[1]; break
                case 'policy': this.#params.policy = param_sections[1]; break
                case 'content': this.#params.content = param_sections[1]; break
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
        else if (this.#params.type === 'generate') {
            const gen = new ContentGenerator(this.#params)
            var result = gen.generate()

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
        this.#test_generator()
        this.#test_parser()
    }

    #test_rule() {
        this.#test_rule_clash2quan_domain()
        this.#test_rule_clash2quan_ipcidr()
        this.#test_rule_clash2quan_ipcidr_no_resolve()
        this.#test_rule_ipasn2quan()
    }

    #test_rewrite() {

    }

    #test_generator() {
        var params = {
            src: 'any',
            dst: 'quan',
            type: 'generate',
            content: 'R0VPSVAsTEFOLERJUkVDVCxuby1yZXNvbHZlCkdFT0lQLENOLERJUkVDVA=='
        }

        const gen = new ContentGenerator(params)
        var result = gen.generate()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.payload.length === 2)
        this.#assert(result.payload[0] === 'GEOIP,LAN,DIRECT,no-resolve')
        this.#assert(result.payload[1] === 'GEOIP,CN,DIRECT')
    }

    #test_parser() {
        this.#test_resource_parser_ipcidr_no_resolve()
        this.#test_resource_parser_content_generator()
        this.#test_resource_parser_content_generator2()
        this.#test_resource_parser_content_generator3()
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

    #test_rule_ipasn2quan() {
        const content =
            `IP-ASN,4134 // 中国电信骨干网
IP-ASN ,   4538 // 中国教育科研网络中心
- IP-ASN,4812,DIRECT,no-resolve // 中国电信（集团）`

        var params = {
            src: 'any',
            dst: 'any',
            type: 'rule',
            subtype: 'ipasn',
            policy: 'DIRECT'
        }

        const conv = new RuleConverter(params, content)
        var result = conv.convert()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.payload.length === 3)
        this.#assert(result.payload[0] === 'IP-ASN,4134,DIRECT')
        this.#assert(result.payload[1] === 'IP-ASN,4538,DIRECT')
        this.#assert(result.payload[2] === 'IP-ASN,4812,DIRECT')

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

    #test_resource_parser_content_generator() {
        const parser = new ResourceParser('https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/local-ips.yaml?src=any&dst=quan&type=generate&content=R0VPSVAsTEFOLERJUkVDVCxuby1yZXNvbHZl', '')

        var result = parser.parse_params()
        this.#assert(result === true)

        result = parser.convert_content()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.content === 'GEOIP,LAN,DIRECT,no-resolve', `content: ${result.content}`)
    }

    #test_resource_parser_content_generator2() {
        const parser = new ResourceParser('https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/local-ips.yaml?src=any&dst=quan&type=generate&content=R0VPSVAsTEFOLERJUkVDVCxuby1yZXNvbHZlCklQLUNJRFIsMTYzLjE3Ny4xNTEuMTA5LzMyLERJUkVDVApJUC1BU04sMTMzMzUsRElSRUNU', '')

        var result = parser.parse_params()
        this.#assert(result === true)

        result = parser.convert_content()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.content === 'GEOIP,LAN,DIRECT,no-resolve\nIP-CIDR,163.177.151.109/32,DIRECT\nIP-ASN,13335,DIRECT', `content: ${result.content}`)
    }

    #test_resource_parser_content_generator3() {
        const parser = new ResourceParser('https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/local-ips.yaml?src=any&dst=quan&type=generate&content=aG9zdG5hbWUgPSAqLmdvb2dsZS5jbgpeaHR0cHM/OlwvXC8od3d3PylcLmdvb2dsZVwuY24gdXJsIDMwMiBodHRwczovL3d3dy5nb29nbGUuY29tLmhr', '')

        var result = parser.parse_params()
        this.#assert(result === true)

        result = parser.convert_content()
        notify(JSON.stringify(result))

        this.#assert(result.result === true)
        this.#assert(result.content === ('hostname = *.google.cn\n^https?:\\/\\/(www?)\\.google\\.cn url 302 https://www.google.com.hk'), `content: ${result.content}`)
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
